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

   
    // Camera Setup 
    async function setupCamera() {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 480, height: 360 },
        });
        video.srcObject = stream;
        return new Promise(resolve => {
            video.onloadedmetadata = () => {
                // Set canvas size to match video
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                resolve(video);
            };
        });
    }

    // ----------------------------
    // Helper Functions
    // ----------------------------
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
        const leftElbowRaised = leftElbow.y <= leftShoulder.y + 50;
        const rightElbowRaised = rightElbow.y <= rightShoulder.y + 50;
        return leftElbowRaised || rightElbowRaised;
    }

    // ----------------------------
    // Drawing Functions
    // ----------------------------
    function drawKeypoint(keypoint, color = '#00ff00') {
        ctx.beginPath();
        ctx.arc(keypoint.x, keypoint.y, 5, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    function drawLine(point1, point2, color = '#00ff00', width = 2) {
        ctx.beginPath();
        ctx.moveTo(point1.x, point1.y);
        ctx.lineTo(point2.x, point2.y);
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.stroke();
    }

    function drawSkeleton(keypoints, minConfidence) {
        // Define skeleton connections
        const connections = [
            // Torso
            ['left_shoulder', 'right_shoulder'],
            ['left_shoulder', 'left_hip'],
            ['right_shoulder', 'right_hip'],
            ['left_hip', 'right_hip'],
            // Left arm
            ['left_shoulder', 'left_elbow'],
            ['left_elbow', 'left_wrist'],
            // Right arm
            ['right_shoulder', 'right_elbow'],
            ['right_elbow', 'right_wrist'],
            // Left leg
            ['left_hip', 'left_knee'],
            ['left_knee', 'left_ankle'],
            // Right leg
            ['right_hip', 'right_knee'],
            ['right_knee', 'right_ankle']
        ];

        // Draw connections
        connections.forEach(([start, end]) => {
            const startPoint = keypoints.find(kp => kp.name === start);
            const endPoint = keypoints.find(kp => kp.name === end);

            if (startPoint && endPoint &&
                startPoint.score > minConfidence &&
                endPoint.score > minConfidence) {

                // Color based on confidence
                let color;
                const avgConfidence = (startPoint.score + endPoint.score) / 2;
                if (avgConfidence > 0.8) {
                    color = '#00ff00'; // Green - high confidence
                } else if (avgConfidence > 0.6) {
                    color = '#ffff00'; // Yellow - medium confidence
                } else {
                    color = '#ff6600'; // Orange - low confidence
                }

                drawLine(startPoint, endPoint, color, 3);
            }
        });

        // Draw keypoints
        keypoints.forEach(keypoint => {
            if (keypoint.score > minConfidence) {
                let color;
                if (keypoint.score > 0.8) {
                    color = '#00ff00';
                } else if (keypoint.score > 0.6) {
                    color = '#ffff00';
                } else {
                    color = '#ff6600';
                }
                drawKeypoint(keypoint, color);
            }
        });
    }

    function drawStatus(message, color = '#00ff00') {
        ctx.font = 'bold 20px Arial';
        ctx.fillStyle = '#000000';
        ctx.fillRect(10, 10, ctx.measureText(message).width + 20, 40);
        ctx.fillStyle = color;
        ctx.fillText(message, 20, 35);
    }

    // ----------------------------
    // Countdown
    // ----------------------------
    async function showCountdown() {
        for (let i = 3; i > 0; i--) {
            countdownEl.textContent = i;
            countdownEl.style.display = 'block';
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        countdownEl.style.display = 'none';
    }

    // ----------------------------
    // Main Pose Analysis with Live Preview
    // ----------------------------
    async function startLivePreview() {
        const detectorConfig = { modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING };
        detector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, detectorConfig);

        const minConfidence = 0.6;

        async function detectFrame() {
            // Clear canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const poses = await detector.estimatePoses(video);

            if (poses.length > 0 && !isAnalyzing) {
                const kp = poses[0].keypoints;

                // Draw skeleton only if enabled
                if (showSkeleton) {
                    drawSkeleton(kp, minConfidence);
                }

                // Check if ready for analysis
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

                // Only draw status if skeleton is visible
                if (showSkeleton) {
                    if (elbowsVisible && feetVisible &&
                        isInShootingPosition(leftShoulder, leftElbow, rightShoulder, rightElbow)) {
                        drawStatus('✓ Ready to Analyze!', '#00ff00');
                    } else if (!elbowsVisible || !feetVisible) {
                        drawStatus('Step back - show full body', '#ff0000');
                    } else {
                        drawStatus('Raise arms to shooting position', '#ffff00');
                    }
                }
            }

            if (!isAnalyzing) {
                requestAnimationFrame(detectFrame);
            }
        }

        detectFrame();
    }

    // ----------------------------
    // Analysis Phase
    // ----------------------------
    async function startAnalysis() {
        isAnalyzing = true;
        frames = [];
        resultsEl.textContent = "Analyzing... Please hold your shooting position.";
        const startTime = performance.now();
        const minConfidence = 0.6;

        async function detectFrame() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const poses = await detector.estimatePoses(video);

            if (poses.length > 0) {
                const kp = poses[0].keypoints;

                // Draw skeleton during analysis only if enabled
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
                        "1. Step back so your full body is visible\n" +
                        "2. Get into shooting position with arms raised\n" +
                        "3. Hold the position steady for 5 seconds";
                    // Restart preview
                    startLivePreview();
                } else {
                    resultsEl.textContent = `Uploading ${frames.length} frames...`;
                    sendData(frames);
                }
            }
        }

        detectFrame();
    }

    // ----------------------------
    // Upload Results to Server
    // ----------------------------
    async function sendData(frames) {
        try {
            const response = await fetch('/Home/SaveAnalysis', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userName: "DemoUser", frames })
            });

            const data = await response.json();
            resultsEl.textContent = JSON.stringify(data, null, 2);

            // Restart preview after showing results
            setTimeout(() => {
                startLivePreview();
            }, 5000);
        } catch (error) {
            resultsEl.textContent = "Error uploading analysis. Check console.";
            console.error(error);
            startLivePreview();
        }
    }

    // ----------------------------
    // Start Button
    // ----------------------------
    startBtn.addEventListener('click', async () => {
        if (!detector) {
            // First time setup
            await setupCamera();
            await startLivePreview();
            startBtn.textContent = "Start Analysis";
            resultsEl.textContent = "Camera ready! Position yourself and click 'Start Analysis' when ready.";
        } else if (!isAnalyzing) {
            // Start countdown then analysis
            await showCountdown();
            await startAnalysis();
        }
    });

    // ----------------------------
    // Skeleton Toggle Button
    // ----------------------------
    const toggleSkeletonBtn = document.getElementById('toggleSkeletonBtn');
    if (toggleSkeletonBtn) {
        toggleSkeletonBtn.addEventListener('click', () => {
            showSkeleton = !showSkeleton;
            if (showSkeleton) {
                toggleSkeletonBtn.textContent = "Hide Skeleton";
                toggleSkeletonBtn.classList.remove('bg-gray-500', 'hover:bg-gray-600', 'border-gray-400');
                toggleSkeletonBtn.classList.add('bg-green-600', 'hover:bg-green-700', 'border-green-500');
            } else {
                toggleSkeletonBtn.textContent = "Show Skeleton";
                toggleSkeletonBtn.classList.remove('bg-green-600', 'hover:bg-green-700', 'border-green-500');
                toggleSkeletonBtn.classList.add('bg-gray-500', 'hover:bg-gray-600', 'border-gray-400');
            }
        });
    }
});