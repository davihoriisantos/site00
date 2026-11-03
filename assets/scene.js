// Davi Jun Portfolio - 3D Neural Beam WebGL Scene
// Inspired by Tandem Beam Design System & AI Architecture

(function() {
  const canvas = document.getElementById('gl');
  if (!canvas || typeof THREE === 'undefined') return;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x050508, 0.0018);

  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 0, 42);

  const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance'
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  // 1. Ambient & Directional Lights
  const ambient = new THREE.AmbientLight(0x181824, 1.2);
  scene.add(ambient);

  // Violet spotlight from above (Tandem signature beam)
  const spotViolet = new THREE.SpotLight(0xb9a9ff, 4, 120, Math.PI / 4, 0.6, 1.5);
  spotViolet.position.set(0, 35, 10);
  scene.add(spotViolet);

  // Subtle crimson rim light (Japanese Sun accent)
  const spotCrimson = new THREE.SpotLight(0xe63946, 2.5, 90, Math.PI / 3, 0.8, 2);
  spotCrimson.position.set(-25, -15, 15);
  scene.add(spotCrimson);

  // 2. Neural Network Nodes & Connections
  const nodeCount = 55;
  const nodes = [];
  const nodeGroup = new THREE.Group();
  scene.add(nodeGroup);

  const sphereGeo = new THREE.SphereGeometry(0.35, 16, 16);
  const nodeMatViolet = new THREE.MeshBasicMaterial({ color: 0xb9a9ff });
  const nodeMatCrimson = new THREE.MeshBasicMaterial({ color: 0xff3b5c });
  const nodeMatWhite = new THREE.MeshBasicMaterial({ color: 0xf3f2ff });

  const bounds = { x: 34, y: 22, z: 20 };

  for (let i = 0; i < nodeCount; i++) {
    const isSpecial = i % 7 === 0;
    const isCrimson = i % 11 === 0;
    const mat = isCrimson ? nodeMatCrimson : (isSpecial ? nodeMatViolet : nodeMatWhite);
    const mesh = new THREE.Mesh(sphereGeo, mat);
    
    mesh.position.set(
      (Math.random() - 0.5) * bounds.x * 2,
      (Math.random() - 0.5) * bounds.y * 2 + 4,
      (Math.random() - 0.5) * bounds.z * 2
    );

    const scale = isCrimson ? 1.4 : (isSpecial ? 1.2 : 0.7 + Math.random() * 0.5);
    mesh.scale.set(scale, scale, scale);

    mesh.userData = {
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 0.025,
        (Math.random() - 0.5) * 0.025,
        (Math.random() - 0.5) * 0.02
      ),
      baseY: mesh.position.y
    };

    nodeGroup.add(mesh);
    nodes.push(mesh);
  }

  // Dynamic lines connecting nearby nodes
  const maxLines = 150;
  const linePositions = new Float32Array(maxLines * 6);
  const lineColors = new Float32Array(maxLines * 6);
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
  lineGeo.setAttribute('color', new THREE.BufferAttribute(lineColors, 3));

  const lineMat = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.35,
    blending: THREE.AdditiveBlending
  });

  const lineMesh = new THREE.LineSegments(lineGeo, lineMat);
  scene.add(lineMesh);

  // 3. Volumetric Beam Cone Geometry (Stage Spotlight)
  const beamGeo = new THREE.CylinderGeometry(1.5, 26, 65, 32, 1, true);
  const beamMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColorViolet: { value: new THREE.Color(0xb9a9ff) },
      uColorCrimson: { value: new THREE.Color(0xe63946) }
    },
    vertexShader: `
      varying vec3 vPosition;
      varying vec2 vUv;
      void main() {
        vPosition = position;
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uColorViolet;
      uniform vec3 uColorCrimson;
      varying vec3 vPosition;
      varying vec2 vUv;
      void main() {
        float heightFactor = smoothstep(-32.5, 32.5, vPosition.y);
        float alpha = pow(heightFactor, 2.2) * 0.14;
        
        // Subtle shimmer
        alpha += sin(vPosition.y * 0.2 + uTime * 0.8) * 0.02;

        vec3 col = mix(uColorCrimson, uColorViolet, vUv.y * 1.2);
        gl_FragColor = vec4(col, clamp(alpha, 0.0, 0.25));
      }
    `,
    transparent: true,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  const beamMesh = new THREE.Mesh(beamGeo, beamMat);
  beamMesh.position.set(0, 15, -8);
  beamMesh.rotation.x = Math.PI * 0.05;
  scene.add(beamMesh);

  // 4. Ambient Stardust Particles
  const dustCount = 140;
  const dustGeo = new THREE.BufferGeometry();
  const dustPos = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount * 3; i += 3) {
    dustPos[i] = (Math.random() - 0.5) * 80;
    dustPos[i + 1] = (Math.random() - 0.5) * 60;
    dustPos[i + 2] = (Math.random() - 0.5) * 40;
  }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dustMat = new THREE.PointsMaterial({
    color: 0xcdc5ff,
    size: 0.6,
    transparent: true,
    opacity: 0.45,
    blending: THREE.AdditiveBlending
  });
  const dustPoints = new THREE.Points(dustGeo, dustMat);
  scene.add(dustPoints);

  // 5. Mouse Interaction
  let targetMouseX = 0;
  let targetMouseY = 0;
  let currentMouseX = 0;
  let currentMouseY = 0;

  window.addEventListener('mousemove', (e) => {
    targetMouseX = (e.clientX / window.innerWidth) * 2 - 1;
    targetMouseY = -(e.clientY / window.innerHeight) * 2 + 1;
  });

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  });

  // 6. Animation Loop
  let clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    const elapsedTime = clock.getElapsedTime();

    // Smooth mouse follow
    currentMouseX += (targetMouseX - currentMouseX) * 0.04;
    currentMouseY += (targetMouseY - currentMouseY) * 0.04;

    camera.position.x = currentMouseX * 4;
    camera.position.y = currentMouseY * 3;
    camera.lookAt(0, 0, 0);

    // Subtle group sway
    nodeGroup.rotation.y = elapsedTime * 0.04;
    nodeGroup.rotation.x = Math.sin(elapsedTime * 0.05) * 0.08;

    beamMat.uniforms.uTime.value = elapsedTime;
    beamMesh.rotation.y = Math.sin(elapsedTime * 0.2) * 0.08;

    dustPoints.rotation.y = elapsedTime * 0.015;

    // Update node positions and compute connections
    let lineIdx = 0;
    const maxDist = 8.5;
    const posArr = lineGeo.attributes.position.array;
    const colArr = lineGeo.attributes.color.array;

    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      n.position.add(n.userData.velocity);

      // Bounce in boundaries
      if (Math.abs(n.position.x) > bounds.x) n.userData.velocity.x *= -1;
      if (Math.abs(n.position.y - n.userData.baseY) > 5) n.userData.velocity.y *= -1;
      if (Math.abs(n.position.z) > bounds.z) n.userData.velocity.z *= -1;

      // Find connections
      for (let j = i + 1; j < nodes.length; j++) {
        if (lineIdx >= maxLines) break;
        const n2 = nodes[j];
        const dist = n.position.distanceTo(n2.position);
        if (dist < maxDist) {
          const pIdx = lineIdx * 6;
          posArr[pIdx] = n.position.x;
          posArr[pIdx + 1] = n.position.y;
          posArr[pIdx + 2] = n.position.z;
          posArr[pIdx + 3] = n2.position.x;
          posArr[pIdx + 4] = n2.position.y;
          posArr[pIdx + 5] = n2.position.z;

          const alpha = 1.0 - (dist / maxDist);
          // Violet-crimson gradient on lines
          colArr[pIdx] = 0.72 * alpha;
          colArr[pIdx + 1] = 0.66 * alpha;
          colArr[pIdx + 2] = 1.0 * alpha;

          colArr[pIdx + 3] = 0.9 * alpha;
          colArr[pIdx + 4] = 0.23 * alpha;
          colArr[pIdx + 5] = 0.35 * alpha;

          lineIdx++;
        }
      }
    }

    // Hide remaining lines
    for (let k = lineIdx * 6; k < maxLines * 6; k++) {
      posArr[k] = 0;
      colArr[k] = 0;
    }

    lineGeo.attributes.position.needsUpdate = true;
    lineGeo.attributes.color.needsUpdate = true;

    renderer.render(scene, camera);
  }

  animate();
})();
