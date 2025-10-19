document.addEventListener("DOMContentLoaded", () => {
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const startBtn = document.getElementById('startBtn');
    const resultsEl = document.getElementById('results');
    const countdownEl = document.getElementById('countdown');

    let detector;
    let frames = [];
    let isAnalyzing = false;
    let showSkeleton = false;

    // Smoothing variables
    let keypointHistory = {};
    const HISTORY_SIZE = 5;
    const SMOOTHING_FACTOR = 0.3;

    // Debouncing for status messages
    let lastStatusMessage = '';
    let statusMessageCount = 0;
    const STATUS_THRESHOLD = 3;

    // Camera Setup - DEFAULT TO 1280x720 for tall players
    async function setupCamera() {
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('Camera access is not supported in this browser');
            }

            resultsEl.textContent = "Requesting camera permission...";

            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: 'user'
                },
            });

            video.srcObject = stream;

            return new Promise((resolve, reject) => {
                video.onloadedmetadata = () => {
                    // Set canvas to match actual video dimensions
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;

                    // Set video element display size to match aspect ratio
                    video.style.width = '100%';
                    video.style.height = 'auto';

                    console.log(`Camera initialized: ${video.videoWidth}x${video.videoHeight}`);
                    resultsEl.textContent = "Camera ready!";
                    resolve(video);
                };

                video.onerror = () => {
                    reject(new Error('Failed to load video stream'));
                };

                setTimeout(() => {
                    reject(new Error('Camera loading timeout'));
                }, 10000);
            });
        } catch (error) {
            console.error('Camera setup error:', error);

            let errorMessage = 'Failed to access camera. ';

            if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
                errorMessage += 'Please allow camera access when prompted by your browser.';
            } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
                errorMessage += 'No camera device found.';
            } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
                errorMessage += 'Camera is already in use by another application.';
            } else if (error.name === 'OverconstrainedError') {
                errorMessage += 'Your camera does not support the requested resolution.';
            } else if (error.name === 'SecurityError') {
                errorMessage += 'Camera access requires HTTPS (secure connection).';
            } else {
                errorMessage += error.message || 'Unknown error occurred.';
            }

            resultsEl.textContent = errorMessage;
            throw error;
        }
    }

    // Smoothing Functions
    function smoothKeypoint(keypoint) {
        const name = keypoint.name;

        if (!keypointHistory[name]) {
            keypointHistory[name] = [];
        }

        keypointHistory[name].push({
            x: keypoint.x,
            y: keypoint.y,
            score: keypoint.score
        });

        if (keypointHistory[name].length > HISTORY_SIZE) {
            keypointHistory[name].shift();
        }

        let smoothedX = keypoint.x;
        let smoothedY = keypoint.y;
        let smoothedScore = keypoint.score;

        if (keypointHistory[name].length > 1) {
            const prev = keypointHistory[name][keypointHistory[name].length - 2];
            smoothedX = SMOOTHING_FACTOR * keypoint.x + (1 - SMOOTHING_FACTOR) * prev.x;
            smoothedY = SMOOTHING_FACTOR * keypoint.y + (1 - SMOOTHING_FACTOR) * prev.y;
            smoothedScore = SMOOTHING_FACTOR * keypoint.score + (1 - SMOOTHING_FACTOR) * prev.score;
        }

        return {
            ...keypoint,
            x: smoothedX,
            y: smoothedY,
            score: smoothedScore
        };
    }

    function smoothAllKeypoints(keypoints) {
        return keypoints.map(kp => smoothKeypoint(kp));
    }

    function resetKeypointHistory() {
        keypointHistory = {};
    }

    function updateStatus(message, color = '#00ff00') {
        if (message === lastStatusMessage) {
            statusMessageCount++;
        } else {
            statusMessageCount = 1;
            lastStatusMessage = message;
        }

        if (statusMessageCount >= STATUS_THRESHOLD) {
            drawStatus(message, color);
        }
    }

    // Helper Functions
    function angleBetween(a, b, c) {
        const ab = [a.x - b.x, a.y - b.y];
        const cb = [c.x - b.x, c.y - b.y];
        const dot = ab[0] * cb[0] + ab[1] * cb[1];
        const magA = Math.sqrt(ab[0] ** 2 + ab[1] ** 2);
        const magC = Math.sqrt(cb[0] ** 2 + cb[1] ** 2);

        if (magA === 0 || magC === 0) return null;

        const cosAngle = dot / (magA * magC);
        const clampedCos = Math.max(-1, Math.min(1, cosAngle));
        const angle = Math.acos(clampedCos);
        return angle * (180 / Math.PI);
    }

    function distance(a, b) {
        return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
    }

    function normalizeDistance(feetDist, shoulderDist) {
        if (shoulderDist === 0) return null;
        return feetDist / shoulderDist;
    }

    function isValidElbowAngle(angle) {
        return angle !== null && angle >= 30 && angle <= 180;
    }

    function isValidFeetDistance(normalizedDist) {
        return normalizedDist !== null && normalizedDist > 0.3 && normalizedDist < 4.0;
    }

    function isInShootingPosition(leftShoulder, leftElbow, rightShoulder, rightElbow) {
        const threshold = 80;
        const leftElbowRaised = leftElbow.y <= leftShoulder.y + threshold;
        const rightElbowRaised = rightElbow.y <= rightShoulder.y + threshold;
        return leftElbowRaised || rightElbowRaised;
    }

    // Drawing Functions
    function drawKeypoint(keypoint, color = '#00ff00') {
        const radius = Math.max(5, canvas.width / 160);

        ctx.beginPath();
        ctx.arc(keypoint.x, keypoint.y, radius, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = Math.max(2, canvas.width / 320);
        ctx.stroke();
    }

    function drawLine(point1, point2, color = '#00ff00', width = 2) {
        ctx.beginPath();
        ctx.moveTo(point1.x, point1.y);
        ctx.lineTo(point2.x, point2.y);
        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(width, canvas.width / 200);
        ctx.stroke();
    }

    function drawSkeleton(keypoints, minConfidence) {
        const connections = [
            ['left_shoulder', 'right_shoulder'],
            ['left_shoulder', 'left_hip'],
            ['right_shoulder', 'right_hip'],
            ['left_hip', 'right_hip'],
            ['left_shoulder', 'left_elbow'],
            ['left_elbow', 'left_wrist'],
            ['right_shoulder', 'right_elbow'],
            ['right_elbow', 'right_wrist'],
            ['left_hip', 'left_knee'],
            ['left_knee', 'left_ankle'],
            ['right_hip', 'right_knee'],
            ['right_knee', 'right_ankle']
        ];

        connections.forEach(([start, end]) => {
            const startPoint = keypoints.find(kp => kp.name === start);
            const endPoint = keypoints.find(kp => kp.name === end);

            if (startPoint && endPoint &&
                startPoint.score > minConfidence &&
                endPoint.score > minConfidence) {

                let color;
                const avgConfidence = (startPoint.score + endPoint.score) / 2;
                if (avgConfidence > 0.7) {
                    color = '#00ff00';
                } else if (avgConfidence > 0.5) {
                    color = '#ffff00';
                } else {
                    color = '#ff6600';
                }

                drawLine(startPoint, endPoint, color, 3);
            }
        });

        keypoints.forEach(keypoint => {
            if (keypoint.score > minConfidence) {
                let color;
                if (keypoint.score > 0.7) {
                    color = '#00ff00';
                } else if (keypoint.score > 0.5) {
                    color = '#ffff00';
                } else {
                    color = '#ff6600';
                }
                drawKeypoint(keypoint, color);
            }
        });
    }

    function drawStatus(message, color = '#00ff00') {
        const fontSize = Math.max(16, canvas.width / 40);
        ctx.font = `bold ${fontSize}px Arial`;

        const padding = fontSize;
        const textWidth = ctx.measureText(message).width;
        const boxHeight = fontSize * 2;

        ctx.fillStyle = '#000000';
        ctx.fillRect(10, 10, textWidth + padding * 2, boxHeight);
        ctx.fillStyle = color;
        ctx.fillText(message, 10 + padding, 10 + fontSize * 1.3);
    }

    // Countdown
    async function showCountdown() {
        for (let i = 3; i > 0; i--) {
            countdownEl.textContent = i;
            countdownEl.style.display = 'block';
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        countdownEl.style.display = 'none';
    }

    // Live Preview
    async function startLivePreview() {
        if (!detector) {
            const detectorConfig = {
                modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING
            };
            detector = await poseDetection.createDetector(
                poseDetection.SupportedModels.MoveNet,
                detectorConfig
            );
        }

        const minConfidence = 0.4;

        async function detectFrame() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            if (!isAnalyzing) {
                const poses = await detector.estimatePoses(video);

                if (poses.length > 0) {
                    const rawKp = poses[0].keypoints;
                    const kp = smoothAllKeypoints(rawKp);

                    if (showSkeleton) {
                        drawSkeleton(kp, minConfidence);
                    }

                    const leftShoulder = kp.find(k => k.name === "left_shoulder");
                    const rightShoulder = kp.find(k => k.name === "right_shoulder");
                    const leftElbow = kp.find(k => k.name === "left_elbow");
                    const rightElbow = kp.find(k => k.name === "right_elbow");
                    const leftWrist = kp.find(k => k.name === "left_wrist");
                    const rightWrist = kp.find(k => k.name === "right_wrist");
                    const leftAnkle = kp.find(k => k.name === "left_ankle");
                    const rightAnkle = kp.find(k => k.name === "right_ankle");

                    const elbowsVisible =
                        leftShoulder?.score > minConfidence &&
                        leftElbow?.score > minConfidence &&
                        leftWrist?.score > minConfidence &&
                        rightShoulder?.score > minConfidence &&
                        rightElbow?.score > minConfidence &&
                        rightWrist?.score > minConfidence;

                    const feetVisible =
                        leftAnkle?.score > minConfidence &&
                        rightAnkle?.score > minConfidence;

                    if (showSkeleton) {
                        let statusMsg = '';
                        let statusColor = '#ffff00';

                        if (elbowsVisible && feetVisible &&
                            isInShootingPosition(leftShoulder, leftElbow, rightShoulder, rightElbow)) {
                            statusMsg = '✓ Ready to Analyze!';
                            statusColor = '#00ff00';
                        } else if (!elbowsVisible || !feetVisible) {
                            statusMsg = 'Step back - show full body';
                            statusColor = '#ff0000';
                        } else {
                            statusMsg = 'Raise arms to shooting position';
                            statusColor = '#ffff00';
                        }

                        updateStatus(statusMsg, statusColor);
                    }
                }
            }

            if (!isAnalyzing) {
                requestAnimationFrame(detectFrame);
            }
        }

        detectFrame();
    }

    // Analysis Phase
    async function startAnalysis() {
        isAnalyzing = true;
        frames = [];
        resetKeypointHistory();
        resultsEl.textContent = "Analyzing... Please hold your shooting position.";
        const startTime = performance.now();
        const minConfidence = 0.4;

        async function detectFrame() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const poses = await detector.estimatePoses(video);

            if (poses.length > 0) {
                const rawKp = poses[0].keypoints;
                const kp = smoothAllKeypoints(rawKp);

                if (showSkeleton) {
                    drawSkeleton(kp, minConfidence);
                }

                const leftShoulder = kp.find(k => k.name === "left_shoulder");
                const rightShoulder = kp.find(k => k.name === "right_shoulder");
                const leftElbow = kp.find(k => k.name === "left_elbow");
                const rightElbow = kp.find(k => k.name === "right_elbow");
                const leftWrist = kp.find(k => k.name === "left_wrist");
                const rightWrist = kp.find(k => k.name === "right_wrist");
                const leftAnkle = kp.find(k => k.name === "left_ankle");
                const rightAnkle = kp.find(k => k.name === "right_ankle");

                const elbowsVisible =
                    leftShoulder?.score > minConfidence &&
                    leftElbow?.score > minConfidence &&
                    leftWrist?.score > minConfidence &&
                    rightShoulder?.score > minConfidence &&
                    rightElbow?.score > minConfidence &&
                    rightWrist?.score > minConfidence;

                const feetVisible =
                    leftAnkle?.score > minConfidence &&
                    rightAnkle?.score > minConfidence;

                if (elbowsVisible && feetVisible) {
                    if (isInShootingPosition(leftShoulder, leftElbow, rightShoulder, rightElbow)) {
                        const leftElbowAngle = angleBetween(leftShoulder, leftElbow, leftWrist);
                        const rightElbowAngle = angleBetween(rightShoulder, rightElbow, rightWrist);

                        if (isValidElbowAngle(leftElbowAngle) && isValidElbowAngle(rightElbowAngle)) {
                            const avgElbowAngle = (leftElbowAngle + rightElbowAngle) / 2;

                            const shoulderDist = distance(leftShoulder, rightShoulder);
                            const feetDistance = distance(leftAnkle, rightAnkle);
                            const normalizedFeetDist = normalizeDistance(feetDistance, shoulderDist);

                            if (isValidFeetDistance(normalizedFeetDist)) {
                                frames.push({
                                    frameIndex: frames.length,
                                    elbowAngle: avgElbowAngle,
                                    feetDistance: normalizedFeetDist
                                });

                                drawStatus(`Capturing: ${frames.length} frames`, '#00ff00');
                            }
                        }
                    }
                }
            }

            if (performance.now() - startTime < 5000) {
                requestAnimationFrame(detectFrame);
            } else {
                isAnalyzing = false;
                if (frames.length < 10) {
                    resultsEl.textContent = "Not enough valid data. Please:\n" +
                        "1. Step back 6-8 feet so your full body is visible\n" +
                        "2. Ensure good lighting\n" +
                        "3. Get into shooting position with arms raised\n" +
                        "4. Hold the position steady for 5 seconds";
                    resetKeypointHistory();
                    startLivePreview();
                } else {
                    resultsEl.textContent = `Uploading ${frames.length} frames...`;
                    sendData(frames);
                }
            }
        }

        detectFrame();
    }

    // Upload Results to Server
    async function sendData(frames) {
        try {
            const response = await fetch('/Home/SaveAnalysis', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userName: "DemoUser", frames })
            });

            const data = await response.json();
            resultsEl.textContent = JSON.stringify(data, null, 2);

            setTimeout(() => {
                resetKeypointHistory();
                startLivePreview();
            }, 5000);
        } catch (error) {
            resultsEl.textContent = "Error uploading analysis. Check console.";
            console.error(error);
            resetKeypointHistory();
            startLivePreview();
        }
    }

    // Start Button
    startBtn.addEventListener('click', async () => {
        if (!detector) {
            try {
                startBtn.disabled = true;
                startBtn.textContent = "Initializing...";

                await setupCamera();
                await startLivePreview();

                startBtn.textContent = "Start Analysis";
                startBtn.disabled = false;
                resultsEl.textContent = "Camera ready! Enable 'Show Skeleton' to verify tracking, then click 'Start Analysis' when ready.";
            } catch (error) {
                startBtn.textContent = "Start Camera";
                startBtn.disabled = false;
            }
        } else if (!isAnalyzing) {
            await showCountdown();
            await startAnalysis();
        }
    });

    // Skeleton Toggle Button
    const toggleSkeletonBtn = document.getElementById('toggleSkeletonBtn');
    if (toggleSkeletonBtn) {
        toggleSkeletonBtn.addEventListener('click', () => {
            showSkeleton = !showSkeleton;
            if (showSkeleton) {
                toggleSkeletonBtn.textContent = "Hide Skeleton";
                toggleSkeletonBtn.classList.remove('bg-gray-500', 'hover:bg-gray-600');
                toggleSkeletonBtn.classList.add('bg-green-600', 'hover:bg-green-700');
            } else {
                toggleSkeletonBtn.textContent = "Show Skeleton";
                toggleSkeletonBtn.classList.remove('bg-green-600', 'hover:bg-green-700');
                toggleSkeletonBtn.classList.add('bg-gray-500', 'hover:bg-gray-600');
            }
        });
    }
});