
document.addEventListener("DOMContentLoaded", () => {
    const video = document.getElementById('video');
    const startBtn = document.getElementById('startBtn');
    const resultsEl = document.getElementById('results');

    let detector;
    let frames = [];

    //cam
    async function setupCamera() {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 480, height: 360 },
        });
        video.srcObject = stream;
        return new Promise(resolve => {
            video.onloadedmetadata = () => resolve(video);
        });
    }

    //elbow angle stuffs
    function angleBetween(a, b, c) {
        const ab = [a.x - b.x, a.y - b.y];
        const cb = [c.x - b.x, c.y - b.y];
        const dot = ab[0] * cb[0] + ab[1] * cb[1];
        const magA = Math.sqrt(ab[0] ** 2 + ab[1] ** 2);
        const magC = Math.sqrt(cb[0] ** 2 + cb[1] ** 2);
        const angle = Math.acos(dot / (magA * magC));
        return angle * (180 / Math.PI);
    }

    //feet dist
    function distance(a, b) {
        return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
    }

   
    async function startAnalysis() {
        const detectorConfig = { modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING };
        detector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, detectorConfig);

        frames = [];
        resultsEl.textContent = "Analyzing...";
        const startTime = performance.now();

        async function detectFrame() {
            const poses = await detector.estimatePoses(video);
            if (poses.length > 0) {
                const kp = poses[0].keypoints;
                const leftShoulder = kp.find(k => k.name === "left_shoulder");
                const leftElbow = kp.find(k => k.name === "left_elbow");
                const leftWrist = kp.find(k => k.name === "left_wrist");
                const leftAnkle = kp.find(k => k.name === "left_ankle");
                const rightAnkle = kp.find(k => k.name === "right_ankle");

                if (leftShoulder && leftElbow && leftWrist && leftAnkle && rightAnkle) {
                    const elbowAngle = angleBetween(leftShoulder, leftElbow, leftWrist);
                    const feetDistance = distance(leftAnkle, rightAnkle);

                    frames.push({
                        frameIndex: frames.length,
                        elbowAngle,
                        feetDistance
                    });
                }
            }

            if (performance.now() - startTime < 5000) { // 5 seconds Rn
                requestAnimationFrame(detectFrame);
            } else {
                resultsEl.textContent = "Uploading results...";
                sendData(frames);
            }
        }

        detectFrame();
    }

    async function sendData(frames) {
        const response = await fetch('/Home/SaveAnalysis', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userName: "DemoUser", frames })
        });

        const data = await response.json();
        resultsEl.textContent = JSON.stringify(data, null, 2);
    }

    startBtn.addEventListener('click', async () => {
        await setupCamera();
        await startAnalysis();
    });
});
