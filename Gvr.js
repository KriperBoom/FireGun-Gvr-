<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <title>FireGun [Powered by Gvr Engine]</title>
    <style>
        body { margin: 0; overflow: hidden; background-color: #050508; font-family: 'Courier New', monospace; user-select: none; }
        canvas { display: block; }
        #ui-layer { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; display: flex; flex-direction: column; justify-content: space-between; align-items: center; padding: 20px; box-sizing: border-box; z-index: 10; }
        .btn { pointer-events: auto; padding: 12px 24px; background: rgba(192, 57, 43, 0.8); border: 2px solid #e74c3c; color: white; border-radius: 4px; font-weight: bold; cursor: pointer; transition: 0.2s; font-family: inherit; }
        .btn:hover { background: rgba(231, 76, 60, 1); transform: scale(1.05); }
        #crosshair { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 8px; height: 8px; border: 2px solid rgba(255,255,255,0.8); border-radius: 50%; pointer-events: none; }
    </style>
    <!-- Подключаем Three.js из твоего репозитория -->
    <script src="three.min.js"></script>
</head>
<body>

    <div id="ui-layer">
        <div id="game-hud" style="color: #e74c3c; font-size: 18px; font-weight: bold; background: rgba(0,0,0,0.7); padding: 8px 16px; border-radius: 4px; text-align: center;">Загрузка Gvr...</div>
        <div id="crosshair"></div>
        <button id="mode-btn" class="btn">Gvr: Включить VR</button>
    </div>

    <script>
        // =========================================================================
        // ⚙️ УНИВЕРСАЛЬНОЕ ЯДРО ДВИЖКА (Gvr ENGINE CORE)
        // =========================================================================
        class GvrEngine {
            constructor() {
                this.scene = null;
                this.renderer = null;
                this.cameraNormal = null;
                this.cameraLeft = null;
                this.cameraRight = null;
                this.isVR = false;
                
                this.gyro = { alpha: 0, beta: 0, gamma: 0 };
                this.raycaster = new THREE.Raycaster();
                this.rayTarget = new THREE.Vector2(0, 0);
                
                this.entities = [];
                this.activeMod = null;
            }

            init() {
                this.scene = new THREE.Scene();
                this.scene.background = new THREE.Color(0x050508);

                const aspect = window.innerWidth / window.innerHeight;
                this.cameraNormal = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
                this.cameraLeft = new THREE.PerspectiveCamera(75, (window.innerWidth / 2) / window.innerHeight, 0.1, 1000);
                this.cameraRight = new THREE.PerspectiveCamera(75, (window.innerWidth / 2) / window.innerHeight, 0.1, 1000);
                
                this.cameraLeft.position.set(-0.25, 0, 0);
                this.cameraRight.position.set(0.25, 0, 0);

                this.renderer = new THREE.WebGLRenderer({ antialias: true });
                this.renderer.setSize(window.innerWidth, window.innerHeight);
                document.body.appendChild(this.renderer.domElement);

                const ambient = new THREE.AmbientLight(0xffffff, 0.4);
                const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
                dirLight.position.set(5, 15, 10);
                this.scene.add(ambient, dirLight);

                this.setupGyro();
                window.addEventListener('resize', () => { this.onWindowResize(); });
            }

            setupGyro() {
                // Полная стрелочная функция без сокращений, чтобы не ловить SyntaxError
                const handleOrientation = (event) => {
                    this.gyro.alpha = event.alpha ? THREE.MathUtils.degToRad(event.alpha) : 0;
                    this.gyro.beta = event.beta ? THREE.MathUtils.degToRad(event.beta) : 0;
                    this.gyro.gamma = event.gamma ? THREE.MathUtils.degToRad(event.gamma) : 0;
                };

                window.addEventListener('deviceorientation', handleOrientation, true);
                
                if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
                    document.body.addEventListener('click', () => {
                        DeviceOrientationEvent.requestPermission().then((res) => {
                            if(res === 'granted') {
                                window.addEventListener('deviceorientation', handleOrientation, true);
                            }
                        }).catch((err) => { console.error(err); });
                    }, { once: true });
                }
            }

            toggleVR(buttonId, crosshairId) {
                this.isVR = !this.isVR;
                const btn = document.getElementById(buttonId);
                const cross = document.getElementById(crosshairId);
                
                if (btn) { btn.innerText = this.isVR ? "Gvr: Обычный режим" : "Gvr: Включить VR"; }
                if (cross) { cross.style.display = this.isVR ? 'none' : 'block'; }
            }

            spawnEntity(entity) {
                this.entities.push(entity);
                if (entity.mesh) { this.scene.add(entity.mesh); }
                if (entity.init) { entity.init(this.scene); }
            }

            getLookTarget() {
                const activeCam = this.isVR ? this.cameraLeft : this.cameraNormal; 
                this.raycaster.setFromCamera(this.rayTarget, activeCam);
                const intersects = this.raycaster.intersectObjects(this.scene.children, true);
                return intersects.length > 0 ? intersects : null;
            }

            updateCameraRotation(camera) {
                camera.rotation.y = this.gyro.alpha;
                camera.rotation.x = this.gyro.beta - Math.PI / 2;
                camera.rotation.z = this.gyro.gamma;
            }

            loadMod(modInstance) {
                this.activeMod = modInstance;
                this.activeMod.start(this);
            }

            startLoop() {
                const loop = () => {
                    requestAnimationFrame(loop);
                    
                    if (this.activeMod && this.activeMod.update) {
                        this.activeMod.update(this);
                    }

                    this.entities.forEach((ent) => { 
                        if(ent.update) { ent.update(this); } 
                    });

                    if (this.isVR) {
                        this.updateCameraRotation(this.cameraLeft);
                        this.updateCameraRotation(this.cameraRight);

                        this.renderer.setViewport(0, 0, window.innerWidth / 2, window.innerHeight);
                        this.renderer.setScissor(0, 0, window.innerWidth / 2, window.innerHeight);
                        this.renderer.setScissorTest(true);
                        this.renderer.render(this.scene, this.cameraLeft);

                        this.renderer.setViewport(window.innerWidth / 2, 0, window.innerWidth / 2, window.innerHeight);
                        this.renderer.setScissor(window.innerWidth / 2, 0, window.innerWidth / 2, window.innerHeight);
                        this.renderer.setScissorTest(true);
                        this.renderer.render(this.scene, this.cameraRight);
                    } else {
                        this.renderer.setScissorTest(false);
                        this.renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);
                        this.updateCameraRotation(this.cameraNormal);
                        this.renderer.render(this.scene, this.cameraNormal);
                    }
                };
                loop();
            }

            onWindowResize() {
                const w = window.innerWidth, h = window.innerHeight;
                this.cameraNormal.aspect = w / h; this.cameraNormal.updateProjectionMatrix();
                this.cameraLeft.aspect = (w/2) / h; this.cameraLeft.updateProjectionMatrix();
                this.cameraRight.aspect = (w/2) / h; this.cameraRight.updateProjectionMatrix();
                this.renderer.setSize(w, h);
            }
        }

        // =========================================================================
        // 🎮 ИГРОВОЙ МОД (FIRE GUN МОДИФИКАЦИЯ)
        // =========================================================================
        class FireGunMod {
            constructor() {
                this.frags = 0;
                this.timeLeft = 60; 
                this.hud = null;
                this.gameOver = false;
                this.timerInterval = null;
            }

            start(engine) {
                this.hud = document.getElementById('game-hud');
                this.updateHUD();

                const grid = new THREE.GridHelper(50, 25, 0xe74c3c, 0x331111);
                grid.position.y = -3;
                engine.scene.add(grid);

                for(let i = 0; i < 6; i++) { this.spawnTarget(engine); }

                this.timerInterval = setInterval(() => {
                    if (this.timeLeft > 0) {
                        this.timeLeft--;
                        this.updateHUD();
                    } else {
                        this.gameOver = true;
                        clearInterval(this.timerInterval);
                        this.updateHUD();
                    }
                }, 1000);
            }

            spawnTarget(engine) {
                if (this.gameOver) return;

                const targetEntity = {
                    mesh: new THREE.Mesh(
