// =========================================================================
// ⚙️ УНИВЕРСАЛЬНЫЙ ДВИЖОК Gvr (Gvr.js)
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
        this.rayTarget = new THREE.Vector2(0, 0); // Центр экрана
        
        this.entities = []; // База данных всех объектов в игре
        this.activeMod = null;
    }

    init() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x050508);

        const aspect = window.innerWidth / window.innerHeight;
        this.cameraNormal = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
        this.cameraLeft = new THREE.PerspectiveCamera(75, (window.innerWidth / 2) / window.innerHeight, 0.1, 1000);
        this.cameraRight = new THREE.PerspectiveCamera(75, (window.innerWidth / 2) / window.innerHeight, 0.1, 1000);
        
        // Базовое межзрачковое расстояние (IPD) для VR
        this.cameraLeft.position.set(-0.25, 0, 0);
        this.cameraRight.position.set(0.25, 0, 0);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(this.renderer.domElement);

        // Стандартный глобальный свет ядра Gvr
        const ambient = new THREE.AmbientLight(0xffffff, 0.4);
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(5, 15, 10);
        this.scene.add(ambient, dirLight);

        this.setupGyro();
        window.addEventListener('resize', () => this.onWindowResize());
    }

    setupGyro() {
        const handleOrientation = (e) => {
            this.gyro.alpha = e.alpha ? THREE.MathUtils.degToRad(e.alpha) : 0;
            this.gyro.beta = e.beta ? THREE.MathUtils.degToRad(e.beta) : 0;
            this.gyro.gamma = e.gamma ? THREE.MathUtils.degToRad(e.gamma) : 0;
        };

        window.addEventListener('deviceorientation', handleOrientation, true);
        
        // Запрос пермишенов для iOS
        if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
            document.body.addEventListener('click', () => {
                DeviceOrientationEvent.requestPermission().then(res => {
                    if(res === 'granted') window.addEventListener('deviceorientation', handleOrientation, true);
                }).catch(console.error);
            }, { once: true });
        }
    }

    toggleVR(buttonId, crosshairId) {
        this.isVR = !this.isVR;
        const btn = document.getElementById(buttonId);
        const cross = document.getElementById(crosshairId);
        
        if (btn) btn.innerText = this.isVR ? "Gvr: Обычный режим" : "Gvr: Включить VR";
        if (cross) cross.style.display = this.isVR ? 'none' : 'block';
    }

    // Создание сущности в мире ядра (аналог Entities в GoldSrc/Half-Life)
    spawnEntity(entity) {
        this.entities.push(entity);
        if (entity.mesh) this.scene.add(entity.mesh);
        if (entity.init) entity.init(this.scene);
    }

    // Проверка направления взгляда (Raycasting)
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

            this.entities.forEach(ent => { if(ent.update) ent.update(this); });

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
