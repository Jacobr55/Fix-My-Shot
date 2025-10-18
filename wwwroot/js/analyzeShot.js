document.addEventListener("DOMContentLoaded", () => {
    const video = document.getElementById('video');
    const startBtn = document.getElementById('startBtn');
    const resultsEl = document.getElementById('results');

    let detector;
    let frames = [];

    // ----------------------------
    // Camera Setup
    // ----------------------------
    async function setupCamera() {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 480, height: 360 },
        });
        video.srcObject = stream;
        return new Promise(resolve => {
            video.onloadedmetadata = () => resolve(video);
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

        // Prevent division by zero
        if (magA === 0 || magC === 0) return null;

        const cosAngle = dot / (magA * magC);
        // Clamp to prevent NaN from floating point errors
        const clampedCos = Math.max(-1, Math.min(1, cosAngle));
        const angle = Math.acos(clampedCos);
        return angle * (180 / Math.PI);
    }

    function distance(a, b) {
        return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
    }

    // Normalize distance based on shoulder width (more stable reference)
    function normalizeDistance(feetDist, shoulderDist) {
        if (shoulderDist === 0) return null;
        return feetDist / shoulderDist;
    }

    // Validate that the angle makes sense for a human arm
    function isValidElbowAngle(angle) {
        return angle !== null && angle >= 30 && angle <= 180;
    }

    // Validate that feet distance makes sense
    function isValidFeetDistance(normalizedDist) {
        return normalizedDist !== null && normalizedDist > 0.3 && normalizedDist < 4.0;
    }

    // Check if person is in shooting position (arms raised)
    function isInShootingPosition(leftShoulder, leftElbow, rightShoulder, rightElbow) {
        // Elbows should be at or above shoulder level (y coordinates smaller = higher in image)
        const leftElbowRaised = leftElbow.y <= leftShoulder.y + 50; // 50px tolerance
        const rightElbowRaised = rightElbow.y <= rightShoulder.y + 50;
        return leftElbowRaised || rightElbowRaised; // At least one arm raised
    }

    // ----------------------------
    // Main Pose Analysis
    // ----------------------------
    async function startAnalysis() {
        const detectorConfig = { modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING };
        detector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, detectorConfig);

        frames = [];
        resultsEl.textContent = "Analyzing... Please get into shooting position with arms raised.";
        const startTime = performance.now();
        const minConfidence = 0.6; // Increased confidence threshold

        async function detectFrame() {
            const poses = await detector.estimatePoses(video);

            if (poses.length > 0) {
                const kp = poses[0].keypoints;

                // Extract keypoints
                const leftShoulder = kp.find(k => k.name === "left_shoulder");
                const rightShoulder = kp.find(k => k.name === "right_shoulder");
                const leftElbow = kp.find(k => k.name === "left_elbow");
                const rightElbow = kp.find(k => k.name === "right_elbow");
                const leftWrist = kp.find(k => k.name === "left_wrist");
                const rightWrist = kp.find(k => k.name === "right_wrist");
                const leftAnkle = kp.find(k => k.name === "left_ankle");
                const rightAnkle = kp.find(k => k.name === "right_ankle");

                // Visibility checks - ALL must be visible
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

                // Only process if ALL required body parts are visible
                if (elbowsVisible && feetVisible) {
                    // Check if in shooting position (arms raised)
                    if (isInShootingPosition(leftShoulder, leftElbow, rightShoulder, rightElbow)) {
                        // Calculate angles
                        const leftElbowAngle = angleBetween(leftShoulder, leftElbow, leftWrist);
                        const rightElbowAngle = angleBetween(rightShoulder, rightElbow, rightWrist);

                        // Validate angles
                        if (isValidElbowAngle(leftElbowAngle) && isValidElbowAngle(rightElbowAngle)) {
                            const avgElbowAngle = (leftElbowAngle + rightElbowAngle) / 2;

                            // Calculate feet distance normalized by shoulder width
                            const shoulderDist = distance(leftShoulder, rightShoulder);
                            const feetDistance = distance(leftAnkle, rightAnkle);
                            const normalizedFeetDist = normalizeDistance(feetDistance, shoulderDist);

                            // Validate normalized feet distance
                            if (isValidFeetDistance(normalizedFeetDist)) {
                                frames.push({
                                    frameIndex: frames.length,
                                    elbowAngle: avgElbowAngle,
                                    feetDistance: normalizedFeetDist
                                });

                                // Update UI to show progress
                                resultsEl.textContent = `Analyzing... Captured ${frames.length} valid frames`;
                            }
                        }
                    }
                }
            }

            // Continue for 5 seconds
            if (performance.now() - startTime < 5000) {
                requestAnimationFrame(detectFrame);
            } else {
                if (frames.length < 10) {
                    // Need minimum frames for reliable analysis
                    resultsEl.textContent = "Not enough valid data. Please:\n" +
                        "1. Step back so your full body is visible\n" +
                        "2. Get into shooting position with arms raised\n" +
                        "3. Hold the position steady for 5 seconds";
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
        } catch (error) {
            resultsEl.textContent = "Error uploading analysis. Check console.";
            console.error(error);
        }
    }

    // ----------------------------
    // Start Button
    // ----------------------------
    startBtn.addEventListener('click', async () => {
        await setupCamera();
        await startAnalysis();
    });
});