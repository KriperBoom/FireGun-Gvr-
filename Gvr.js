<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <title>FireGun [Powered by Gvr]</title>
    <style>
        body { margin: 0; overflow: hidden; background-color: #050508; font-family: monospace; user-select: none; }
        canvas { display: block; }
        #ui-layer { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; display: flex; flex-direction: column; justify-content: space-between; align-items: center; padding: 20px; box-sizing: border-box; z-index: 10; }
        .controls-row { display: flex; gap: 10px; pointer-events: auto; }
        .btn { padding: 12px 24px; background: #c0392b; border: 2px solid #e74c3c; color: white; font-weight: bold; cursor: pointer; border-radius: 4px; font-family: inherit; }
        .btn-blue { background: #2980b9; border: 2px solid #3498db; }
        #crosshair { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 8px; height: 8px; border: 2px solid #fff; border-radius: 50%; pointer-events: none; }
    </style>
    <script src="three.min.js"></script>
    <script src="Gvr.js"></script>
</head>
<body>

    <div id="ui-layer">
        <div id="game-hud" style="color: #e74c3c; font-size: 18px; font-weight: bold; background: rgba(0,0,0,0.7); padding: 8px 16px; border-radius: 4px;">Загрузка движка...</div>
        <div id="crosshair"></div>
        <div class="controls-row">
            <button id="reset-btn" class="btn btn-blue">Сбросить прицел</button>
            <button id="mode-btn" class="btn">Gvr: Включить VR</button>
        </div>
    </div>

    <script>
        window.addEventListener('DOMContentLoaded', function() {
            try {
                var Gvr = new GvrEngine();
                Gvr.init();

                class FireGunMod {
                    constructor() {
                        this.frags = 0;
                        this.timeLeft = 60;
                        this.hud = document.getElementById('game-hud');
                        this.gameOver = false;
                    }

                    start(engine) {
                        this.updateHUD();
                        var grid = new THREE.GridHelper(50, 25, 0xe74c3c, 0x331111);
                        grid.position.y = -3;
                        engine.scene.add(grid);

                        for (var i = 0; i < 6; i++) { this.spawnTarget(engine); }

                        var self = this;
                        var timer = setInterval(function() {
                            if (self.timeLeft > 0) {
                                self.timeLeft--;
                                self.updateHUD();
                            } else {
                                self.gameOver = true;
                                clearInterval(timer);
                                self.updateHUD();
                            }
                        }, 1000);
                    }

                    spawnTarget(engine) {
                        if (this.gameOver) return;
                        var target = {
                            mesh: new THREE.Mesh(
                                new THREE.BoxGeometry(1.5, 1.5, 1.5),
                                new THREE.MeshStandardMaterial({ color: 0x9b59b6, wireframe: true })
                            ),
                            init: function() {
                                this.mesh.position.set((Math.random()-0.5)*20, (Math.random()-0.5)*8+2, (Math.random()-0.5)*20-4);
                                this.aimTime = 0;
                            },
                            update: function() {
                                this.mesh.rotation.x += 0.02;
                                this.mesh.rotation.y += 0.01;
                            }
                        };
                        engine.spawnEntity(target);
                    }

                    update(engine) {
                        if (this.gameOver) {
                            engine.entities = [];
                            return;
                        }
                        var hit = engine.getLookTarget();
                        if (hit && hit.object) {
                            var ent = null;
                            for (var i = 0; i < engine.entities.length; i++) {
                                if (engine.entities[i].mesh === hit.object) { ent = engine.entities[i]; break; }
                            }
                            if (ent && ent.aimTime !== undefined) {
                                ent.aimTime++;
                                ent.mesh.scale.setScalar(1 - (ent.aimTime / 30));
                                if (ent.aimTime >= 30) {
                                    engine.scene.remove(ent.mesh);
                                    var nextEnts = [];
                                    for (var j = 0; j < engine.entities.length; j++) {
                                        if (engine.entities[j] !== ent) nextEnts.push(engine.entities[j]);
                                    }
                                    engine.entities = nextEnts;
                                    this.frags++;
                                    this.updateHUD();
                                    this.spawnTarget(engine);
                                }
                            }
                        } else {
                            for (var k = 0; k < engine.entities.length; k++) {
                                if (engine.entities[k].aimTime > 0) {
                                    engine.entities[k].aimTime = 0;
                                    engine.entities[k].mesh.scale.setScalar(1);
                                }
                            }
                        }
                    }

                    updateHUD() {
                        if (!this.hud) return;
                        if (this.gameOver) {
                            this.hud.innerHTML = 'КОНЕЦ МАТЧА!<br>РЕЗУЛЬТАТ: ' + this.frags + ' КУБОВ';
                        } else {
                            this.hud.innerHTML = '[FIREGUN] FRAGS: ' + this.frags + ' | ВРЕМЯ: ' + this.timeLeft + 'с';
                        }
                    }
                }

                var FireGun = new FireGunMod();
                Gvr.loadMod(FireGun);
                Gvr.startLoop();

                // Кнопка включения VR в движке
                document.getElementById('mode-btn').addEventListener('click', function() {
                    Gvr.toggleVR('mode-btn', 'crosshair');
                });

                // Системная кнопка калибровки/сброса прицела
                document.getElementById('reset-btn').addEventListener('click', function() {
                    Gvr.recalibrate();
                });

            } catch (e) {
                console.error(e);
                document.getElementById('game-hud').innerText = "ОШИБКА Gvr";
            }
        });
    </script>
</body>
</html>
