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
        this.rayTarget = new THREE.Vector2(0, 0);
        
        this.entities = [];
        this.activeMod = null;
    }

    init() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x050508);

        var aspect = window.innerWidth / window.innerHeight;
        this.cameraNormal = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
        this.cameraLeft = new THREE.PerspectiveCamera(75, (window.innerWidth / 2) / window.innerHeight, 0.1, 1000);
        this.cameraRight = new THREE.PerspectiveCamera(75, (window.innerWidth / 2) / window.innerHeight, 0.1, 1000);
        
        this.cameraLeft.position.set(-0.25, 0, 0);
        this.cameraRight.position.set(0.25, 0, 0);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(this.renderer.domElement);

        var ambient = new THREE.AmbientLight(0xffffff, 0.4);
        var dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(5, 15, 10);
        this.scene.add(ambient, dirLight);

        this.setupGyro();
        
        var self = this;
        window.addEventListener('resize', function() { self.onWindowResize(); });
    }

    setupGyro() {
        var self = this;
        var handleOrientation = function(event) {
            self.gyro.alpha = event.alpha ? THREE.MathUtils.degToRad(event.alpha) : 0;
            self.gyro.beta = event.beta ? THREE.MathUtils.degToRad(event.beta) : 0;
            self.gyro.gamma = event.gamma ? THREE.MathUtils.degToRad(event.gamma) : 0;
        };

        window.addEventListener('deviceorientation', handleOrientation, true);
        
        if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
            document.body.addEventListener('click', function() {
                DeviceOrientationEvent.requestPermission().then(function(res) {
                    if(res === 'granted') {
                        window.addEventListener('deviceorientation', handleOrientation, true);
                    }
                }).catch(function(err) { console.error(err); });
            }, { once: true });
        }
    }

    toggleVR(buttonId, crosshairId) {
        this.isVR = !this.isVR;
        var btn = document.getElementById(buttonId);
        var cross = document.getElementById(crosshairId);
        
        if (btn) { btn.innerText = this.isVR ? "Gvr: Обычный режим" : "Gvr: Включить VR"; }
        if (cross) { cross.style.display = this.isVR ? 'none' : 'block'; }
    }

    spawnEntity(entity) {
        this.entities.push(entity);
        if (entity.mesh) { this.scene.add(entity.mesh); }
        if (entity.init) { entity.init(this.scene); }
    }

    getLookTarget() {
        var activeCam = this.isVR ? this.cameraLeft : this.cameraNormal; 
        this.raycaster.setFromCamera(this.rayTarget, activeCam);
        var intersects = this.raycaster.intersectObjects(this.scene.children, true);
        return intersects.length > 0 ? intersects : null;
    }

        updateCameraRotation(camera) {
        // Если включен VR (телефон лежит боком) — меняем оси местами и корректируем инверсию
        if (this.isVR) {
            camera.rotation.y = this.gyro.beta;   // Наклон телефона вперед/назад становится поворотом влево/вправо
            camera.rotation.x = this.gyro.alpha;  // Поворот влево/вправо становится наклоном вверх/вниз
            camera.rotation.z = -this.gyro.gamma; // Коррекция крена
        } else {
            // Обычный вертикальный режим (Magic Window)
            camera.rotation.y = this.gyro.alpha;
            camera.rotation.x = this.gyro.beta - Math.PI / 2;
            camera.rotation.z = this.gyro.gamma;
        }
    }

    loadMod(modInstance) {
        this.activeMod = modInstance;
        this.activeMod.start(this);
    }

    startLoop() {
        var self = this;
        var loop = function() {
            requestAnimationFrame(loop);
            
            if (self.activeMod && self.activeMod.update) {
                self.activeMod.update(self);
            }

            for (var i = 0; i < self.entities.length; i++) {
                var ent = self.entities[i];
                if (ent && ent.update) { ent.update(self); }
            }

            if (self.isVR) {
                self.updateCameraRotation(self.cameraLeft);
                self.updateCameraRotation(self.cameraRight);

                self.renderer.setViewport(0, 0, window.innerWidth / 2, window.innerHeight);
                self.renderer.setScissor(0, 0, window.innerWidth / 2, window.innerHeight);
                self.renderer.setScissorTest(true);
                self.renderer.render(self.scene, self.cameraLeft);

                self.renderer.setViewport(window.innerWidth / 2, 0, window.innerWidth / 2, window.innerHeight);
                self.renderer.setScissor(window.innerWidth / 2, 0, window.innerWidth / 2, window.innerHeight);
                self.renderer.setScissorTest(true);
                self.renderer.render(self.scene, self.cameraRight);
            } else {
                self.renderer.setScissorTest(false);
                self.renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);
                self.updateCameraRotation(self.cameraNormal);
                self.renderer.render(self.scene, self.cameraNormal);
            }
        };
        loop();
    }

    onWindowResize() {
        var w = window.innerWidth, h = window.innerHeight;
        this.cameraNormal.aspect = w / h; this.cameraNormal.updateProjectionMatrix();
        this.cameraLeft.aspect = (w/2) / h; this.cameraLeft.updateProjectionMatrix();
        this.cameraRight.aspect = (w/2) / h; this.cameraRight.updateProjectionMatrix();
        this.renderer.setSize(w, h);
    }
}
