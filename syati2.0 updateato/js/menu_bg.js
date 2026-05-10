'use strict';

window.menuOceanRenderer = null;
window.menuOceanScene = null;
window.menuOceanCamera = null;
window.menuOceanWater = null;
window.menuOceanSky = null;
window.menuOceanAnimId = null;

window.startMenuOcean = function() {
    if (window.menuOceanRenderer) return;

    // Canvas container
    const container = document.createElement('div');
    container.id = 'menu-ocean-container';
    container.style.position = 'absolute';
    container.style.inset = '0';
    container.style.zIndex = '0'; // Behind #start-screen
    document.body.insertBefore(container, document.body.firstChild);

    // Make #start-screen transparent
    const startScreen = document.getElementById('start-screen');
    if (startScreen) {
        startScreen.style.background = 'transparent';
    }

    // Renderer
    window.menuOceanRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    window.menuOceanRenderer.setPixelRatio(window.devicePixelRatio);
    window.menuOceanRenderer.setSize(window.innerWidth, window.innerHeight);
    window.menuOceanRenderer.toneMapping = THREE.ACESFilmicToneMapping;
    window.menuOceanRenderer.toneMappingExposure = 0.57; 
    container.appendChild(window.menuOceanRenderer.domElement);

    // Scene & Camera
    window.menuOceanScene = new THREE.Scene();
    // 奥に行くほど霞むグラデーションを追加 (色を空のベースに合わせる)
    window.menuOceanScene.fog = new THREE.FogExp2(0xd0ddec, 0.002); 

    window.menuOceanCamera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 1, 20000);
    window.menuOceanCamera.position.set(30, 30, 100);

    // Water
    const waterNormals = new THREE.TextureLoader().load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/waternormals.jpg', function(texture) {
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    });

    window.menuOceanWater = new THREE.Water(
        new THREE.PlaneGeometry(10000, 10000),
        {
            textureWidth: 512,
            textureHeight: 512,
            waterNormals: waterNormals,
            alpha: 1.0,
            sunDirection: new THREE.Vector3(),
            sunColor: 0xffffff,
            waterColor: 0x0091ff, 
            distortionScale: 4.7,
            fog: window.menuOceanScene.fog !== undefined
        }
    );
    window.menuOceanWater.rotation.x = -Math.PI / 2;
    window.menuOceanScene.add(window.menuOceanWater);

    // Sky
    if (THREE.Sky) {
        window.menuOceanSky = new THREE.Sky();
        window.menuOceanSky.scale.setScalar(10000);
        window.menuOceanScene.add(window.menuOceanSky);

        const skyUniforms = window.menuOceanSky.material.uniforms;
        skyUniforms['turbidity'].value = 1.7; 
        skyUniforms['rayleigh'].value = 0.9; 
        skyUniforms['mieCoefficient'].value = 0.004; 
        skyUniforms['mieDirectionalG'].value = 0.87;

        // Sun position
        const sun = new THREE.Vector3();
        const pmremGenerator = new THREE.PMREMGenerator(window.menuOceanRenderer);

        // --- Custom Cloud Layer ---
        const cloudGeo = new THREE.PlaneGeometry(30000, 30000); // 雲の範囲を拡大
        const cloudMat = new THREE.ShaderMaterial({
            transparent: true,
            depthWrite: false,
            side: THREE.DoubleSide, // 両面描画を有効化
            uniforms: {
                time: { value: 0 },
                sunPosition: { value: new THREE.Vector3() },
                cloudCoverage: { value: 0.78 },
                cloudDensity: { value: 0.73 }
            },
            vertexShader: `
                varying vec2 vUv;
                varying vec3 vWorldPosition;
                void main() {
                    vUv = uv;
                    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                    vWorldPosition = worldPosition.xyz;
                    gl_Position = projectionMatrix * viewMatrix * worldPosition;
                }
            `,
            fragmentShader: `
                uniform float time;
                uniform vec3 sunPosition;
                uniform float cloudCoverage;
                uniform float cloudDensity;
                varying vec2 vUv;
                varying vec3 vWorldPosition;

                float hash(vec2 p) { return fract(1e4 * sin(17.0 * p.x + p.y * 0.1) * (0.1 + abs(sin(p.y * 13.0 + p.x)))); }
                float noise(vec2 x) {
                    vec2 i = floor(x); vec2 f = fract(x);
                    float a = hash(i); float b = hash(i + vec2(1.0, 0.0));
                    float c = hash(i + vec2(0.0, 1.0)); float d = hash(i + vec2(1.0, 1.0));
                    vec2 u = f * f * (3.0 - 2.0 * f);
                    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
                }
                float fbm(vec2 x) {
                    float v = 0.0; float a = 0.5; vec2 shift = vec2(100.0);
                    mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
                    for (int i = 0; i < 5; ++i) { v += a * noise(x); x = rot * x * 2.0 + shift; a *= 0.5; }
                    return v;
                }
                void main() {
                    vec2 p = vWorldPosition.xz * 0.0004 + time * 0.04;
                    float n = fbm(p);
                    
                    float coverage = smoothstep(1.0 - cloudCoverage, 1.0 - cloudCoverage + 0.4, n);
                    
                    vec3 L = normalize(sunPosition);
                    float n_light = fbm(p + L.xz * 0.05);
                    float diffuse = clamp((n - n_light) * 4.0 + 0.4, 0.0, 1.0);
                    
                    vec3 baseCloudColor = vec3(0.95, 0.98, 1.0);
                    vec3 sunLightColor = vec3(1.0, 0.9, 0.8) * 1.5;
                    if (L.y < 0.2) {
                        sunLightColor = mix(vec3(1.0, 0.4, 0.1), vec3(1.0, 0.9, 0.8), max(0.0, L.y * 5.0));
                    }
                    vec3 cloudColor = mix(baseCloudColor * 0.7, sunLightColor, diffuse);
                    
                    float dist = length(vWorldPosition.xz);
                    float fade = smoothstep(15000.0, 5000.0, dist);
                    
                    gl_FragColor = vec4(cloudColor, coverage * cloudDensity * fade * 0.9);
                }
            `
        });
        window.menuOceanCloud = new THREE.Mesh(cloudGeo, cloudMat);
        window.menuOceanCloud.rotation.x = Math.PI / 2; // 下向きに修正
        window.menuOceanCloud.position.y = 1000;
        window.menuOceanCloud.renderOrder = 10; 
        window.menuOceanScene.add(window.menuOceanCloud);


        function updateSun(elevation, azimuth) {
            const phi = THREE.MathUtils.degToRad(90 - elevation);
            const theta = THREE.MathUtils.degToRad(azimuth);
            sun.setFromSphericalCoords(1, phi, theta);
            
            window.menuOceanSky.material.uniforms['sunPosition'].value.copy(sun);
            window.menuOceanWater.material.uniforms['sunDirection'].value.copy(sun).normalize();
            window.menuOceanCloud.material.uniforms['sunPosition'].value.copy(sun);
            
            window.menuOceanScene.environment = pmremGenerator.fromScene(window.menuOceanSky).texture;
        }

        updateSun(29.1, 147); 
    }

    window.addEventListener('resize', onMenuOceanResize);

    function animateOcean() {
        if (!window.menuOceanRenderer) return;
        window.menuOceanAnimId = requestAnimationFrame(animateOcean);
        renderOcean();
    }
    animateOcean();
};

function onMenuOceanResize() {
    if (!window.menuOceanCamera || !window.menuOceanRenderer) return;
    window.menuOceanCamera.aspect = window.innerWidth / window.innerHeight;
    window.menuOceanCamera.updateProjectionMatrix();
    window.menuOceanRenderer.setSize(window.innerWidth, window.innerHeight);
}

function renderOcean() {
    const time = performance.now() * 0.001;

    if (window.menuOceanWater) {
        window.menuOceanWater.material.uniforms['time'].value += 1.0 / 60.0;
    }
    if (window.menuOceanCloud) {
        window.menuOceanCloud.material.uniforms['time'].value = time;
    }

    if (window.menuOceanCamera) {
        // ゆっくり揺らす
        window.menuOceanCamera.position.x = Math.sin(time * 0.05) * 20;
        window.menuOceanCamera.position.y = 28 + Math.sin(time * 0.08) * 4;
        window.menuOceanCamera.position.z = 100 + Math.cos(time * 0.05) * 10;
        window.menuOceanCamera.lookAt(Math.sin(time * 0.03) * 10, 35, 0); // 視点を上げて空を多く映す (10 -> 35)
    }

    if (window.menuOceanRenderer && window.menuOceanScene && window.menuOceanCamera) {
        window.menuOceanRenderer.render(window.menuOceanScene, window.menuOceanCamera);
    }
}

window.stopMenuOcean = function() {
    if (window.menuOceanAnimId !== null) {
        cancelAnimationFrame(window.menuOceanAnimId);
        window.menuOceanAnimId = null;
    }
    window.removeEventListener('resize', onMenuOceanResize);
    
    if (window.menuOceanRenderer) {
        window.menuOceanRenderer.dispose();
        const container = document.getElementById('menu-ocean-container');
        if (container && container.parentNode) {
            container.parentNode.removeChild(container);
        }
        window.menuOceanRenderer = null;
    }
    
    // 背景色を白に戻す (ゲーム中はstart-screenは隠れるが念のため)
    const startScreen = document.getElementById('start-screen');
    if (startScreen) {
        startScreen.style.background = '#fff';
    }

    window.menuOceanScene = null;
    window.menuOceanCamera = null;
    window.menuOceanWater = null;
    window.menuOceanSky = null;
    window.menuOceanCloud = null;
};
