/**
 * OrbitControls — minimal robust implementation for Three.js r128
 * Supports: mouse orbit/zoom/pan, touch orbit/pinch, damping, auto-rotate
 */
(function () {
  'use strict';

  function OrbitControls(camera, domElement) {
    this.camera     = camera;
    this.domElement = domElement;
    this.enabled    = true;

    // Target point to orbit around
    this.target = new THREE.Vector3();

    // Distances
    this.minDistance = 0;
    this.maxDistance = Infinity;

    // Polar angle limits (radians)
    this.minPolarAngle = 0;
    this.maxPolarAngle = Math.PI;

    // Azimuth angle limits
    this.minAzimuthAngle = -Infinity;
    this.maxAzimuthAngle =  Infinity;

    // Damping
    this.enableDamping  = false;
    this.dampingFactor  = 0.05;

    // Zoom
    this.enableZoom = true;
    this.zoomSpeed  = 1.0;

    // Rotate
    this.enableRotate = true;
    this.rotateSpeed  = 1.0;

    // Pan
    this.enablePan       = true;
    this.panSpeed        = 1.0;
    this.screenSpacePanning = true;

    // Auto-rotate
    this.autoRotate      = false;
    this.autoRotateSpeed = 2.0;

    // Internal state
    var scope = this;
    var EPS   = 0.000001;

    var STATE = { NONE: -1, ROTATE: 0, DOLLY: 1, PAN: 2 };
    var state = STATE.NONE;

    var spherical      = new THREE.Spherical();
    var sphericalDelta = new THREE.Spherical();
    var panOffset      = new THREE.Vector3();
    var scale          = 1;
    var zoomChanged    = false;

    var rotateStart = new THREE.Vector2();
    var rotateEnd   = new THREE.Vector2();
    var rotateDelta = new THREE.Vector2();

    var panStart = new THREE.Vector2();
    var panEnd   = new THREE.Vector2();
    var panDelta = new THREE.Vector2();

    var dollyStart = new THREE.Vector2();
    var dollyEnd   = new THREE.Vector2();
    var dollyDelta = new THREE.Vector2();

    // Touch
    var touches = { ONE: null, TWO: null };
    var touchStartDistance = 0;

    // Offset vectors (reused)
    var offset       = new THREE.Vector3();
    var lastPosition = new THREE.Vector3();
    var lastQuaternion = new THREE.Quaternion();

    // Quat to align camera.up to Y
    var quat = new THREE.Quaternion().setFromUnitVectors(
      camera.up, new THREE.Vector3(0, 1, 0)
    );
    var quatInverse = quat.clone().invert();

    // ------- helpers -------
    function getAutoRotationAngle() {
      return 2 * Math.PI / 60 / 60 * scope.autoRotateSpeed;
    }
    function getZoomScale() {
      return Math.pow(0.95, scope.zoomSpeed);
    }
    function rotateLeft(angle)  { sphericalDelta.theta -= angle; }
    function rotateUp(angle)    { sphericalDelta.phi   -= angle; }

    var panLeftV  = new THREE.Vector3();
    var panUpV    = new THREE.Vector3();

    function panLeft(distance, objectMatrix) {
      panLeftV.setFromMatrixColumn(objectMatrix, 0);
      panLeftV.multiplyScalar(-distance);
      panOffset.add(panLeftV);
    }
    function panUp(distance, objectMatrix) {
      if (scope.screenSpacePanning) {
        panUpV.setFromMatrixColumn(objectMatrix, 1);
      } else {
        panUpV.setFromMatrixColumn(objectMatrix, 0);
        panUpV.crossVectors(scope.camera.up, panUpV);
      }
      panUpV.multiplyScalar(distance);
      panOffset.add(panUpV);
    }
    function pan(deltaX, deltaY) {
      var el = scope.domElement;
      if (scope.camera.isPerspectiveCamera) {
        var pos = scope.camera.position;
        offset.copy(pos).sub(scope.target);
        var targetDist = offset.length() * Math.tan((scope.camera.fov / 2) * Math.PI / 180);
        panLeft(2 * deltaX * targetDist / el.clientHeight, scope.camera.matrix);
        panUp  (2 * deltaY * targetDist / el.clientHeight, scope.camera.matrix);
      } else {
        panLeft(deltaX * (scope.camera.right - scope.camera.left) / scope.camera.zoom / el.clientWidth,  scope.camera.matrix);
        panUp  (deltaY * (scope.camera.top  - scope.camera.bottom) / scope.camera.zoom / el.clientHeight, scope.camera.matrix);
      }
    }
    function dollyIn(ds)  { if (scope.camera.isPerspectiveCamera) { scale /= ds; } }
    function dollyOut(ds) { if (scope.camera.isPerspectiveCamera) { scale *= ds; } }

    // ------- mouse handlers -------
    function onMouseDown(e) {
      if (!scope.enabled) return;
      e.preventDefault();
      if (e.button === 0) {
        if (!scope.enableRotate) return;
        rotateStart.set(e.clientX, e.clientY);
        state = STATE.ROTATE;
      } else if (e.button === 1) {
        if (!scope.enableZoom) return;
        dollyStart.set(e.clientX, e.clientY);
        state = STATE.DOLLY;
      } else if (e.button === 2) {
        if (!scope.enablePan) return;
        panStart.set(e.clientX, e.clientY);
        state = STATE.PAN;
      }
      if (state !== STATE.NONE) {
        document.addEventListener('mousemove', onMouseMove, false);
        document.addEventListener('mouseup',   onMouseUp,   false);
      }
    }
    function onMouseMove(e) {
      if (!scope.enabled) return;
      e.preventDefault();
      if (state === STATE.ROTATE) {
        rotateEnd.set(e.clientX, e.clientY);
        rotateDelta.subVectors(rotateEnd, rotateStart).multiplyScalar(scope.rotateSpeed);
        var el = scope.domElement;
        rotateLeft(2 * Math.PI * rotateDelta.x / el.clientHeight);
        rotateUp  (2 * Math.PI * rotateDelta.y / el.clientHeight);
        rotateStart.copy(rotateEnd);
      } else if (state === STATE.DOLLY) {
        dollyEnd.set(e.clientX, e.clientY);
        dollyDelta.subVectors(dollyEnd, dollyStart);
        if (dollyDelta.y > 0) dollyOut(getZoomScale());
        else if (dollyDelta.y < 0) dollyIn(getZoomScale());
        dollyStart.copy(dollyEnd);
      } else if (state === STATE.PAN) {
        panEnd.set(e.clientX, e.clientY);
        panDelta.subVectors(panEnd, panStart).multiplyScalar(scope.panSpeed);
        pan(panDelta.x, panDelta.y);
        panStart.copy(panEnd);
      }
      scope.update();
    }
    function onMouseUp() {
      document.removeEventListener('mousemove', onMouseMove, false);
      document.removeEventListener('mouseup',   onMouseUp,   false);
      state = STATE.NONE;
    }
    function onWheel(e) {
      if (!scope.enabled || !scope.enableZoom) return;
      e.preventDefault();
      e.stopPropagation();
      if (e.deltaY < 0) dollyIn(getZoomScale());
      else if (e.deltaY > 0) dollyOut(getZoomScale());
      scope.update();
    }
    function onContextMenu(e) { if (scope.enabled) e.preventDefault(); }

    // ------- touch handlers -------
    function onTouchStart(e) {
      if (!scope.enabled) return;
      e.preventDefault();
      if (e.touches.length === 1) {
        if (!scope.enableRotate) return;
        rotateStart.set(e.touches[0].pageX, e.touches[0].pageY);
        state = STATE.ROTATE;
      } else if (e.touches.length === 2) {
        var dx = e.touches[0].pageX - e.touches[1].pageX;
        var dy = e.touches[0].pageY - e.touches[1].pageY;
        touchStartDistance = Math.sqrt(dx * dx + dy * dy);
        state = STATE.DOLLY;
      }
    }
    function onTouchMove(e) {
      if (!scope.enabled) return;
      e.preventDefault();
      if (e.touches.length === 1 && state === STATE.ROTATE) {
        rotateEnd.set(e.touches[0].pageX, e.touches[0].pageY);
        rotateDelta.subVectors(rotateEnd, rotateStart).multiplyScalar(scope.rotateSpeed);
        var el = scope.domElement;
        rotateLeft(2 * Math.PI * rotateDelta.x / el.clientHeight);
        rotateUp  (2 * Math.PI * rotateDelta.y / el.clientHeight);
        rotateStart.copy(rotateEnd);
        scope.update();
      } else if (e.touches.length === 2 && state === STATE.DOLLY) {
        var dx = e.touches[0].pageX - e.touches[1].pageX;
        var dy = e.touches[0].pageY - e.touches[1].pageY;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > touchStartDistance) dollyIn(getZoomScale());
        else dollyOut(getZoomScale());
        touchStartDistance = dist;
        scope.update();
      }
    }
    function onTouchEnd() { state = STATE.NONE; }

    // ------- bind events -------
    domElement.addEventListener('contextmenu', onContextMenu, false);
    domElement.addEventListener('mousedown',   onMouseDown,   false);
    domElement.addEventListener('wheel',       onWheel,       { passive: false });
    domElement.addEventListener('touchstart',  onTouchStart,  { passive: false });
    domElement.addEventListener('touchmove',   onTouchMove,   { passive: false });
    domElement.addEventListener('touchend',    onTouchEnd,    false);

    // ------- public update -------
    this.update = function () {
      var position = scope.camera.position;

      offset.copy(position).sub(scope.target);
      offset.applyQuaternion(quat);

      spherical.setFromVector3(offset);

      if (scope.autoRotate && state === STATE.NONE) {
        rotateLeft(getAutoRotationAngle());
      }

      if (scope.enableDamping) {
        spherical.theta += sphericalDelta.theta * scope.dampingFactor;
        spherical.phi   += sphericalDelta.phi   * scope.dampingFactor;
      } else {
        spherical.theta += sphericalDelta.theta;
        spherical.phi   += sphericalDelta.phi;
      }

      // Clamp
      spherical.theta = Math.max(scope.minAzimuthAngle, Math.min(scope.maxAzimuthAngle, spherical.theta));
      spherical.phi   = Math.max(scope.minPolarAngle,   Math.min(scope.maxPolarAngle,   spherical.phi));
      spherical.makeSafe();
      spherical.radius *= scale;
      spherical.radius = Math.max(scope.minDistance, Math.min(scope.maxDistance, spherical.radius));

      if (scope.enableDamping) {
        scope.target.addScaledVector(panOffset, scope.dampingFactor);
      } else {
        scope.target.add(panOffset);
      }

      offset.setFromSpherical(spherical);
      offset.applyQuaternion(quatInverse);

      position.copy(scope.target).add(offset);
      scope.camera.lookAt(scope.target);

      if (scope.enableDamping) {
        sphericalDelta.theta *= (1 - scope.dampingFactor);
        sphericalDelta.phi   *= (1 - scope.dampingFactor);
        panOffset.multiplyScalar(1 - scope.dampingFactor);
      } else {
        sphericalDelta.set(0, 0, 0);
        panOffset.set(0, 0, 0);
      }
      scale = 1;
      zoomChanged = false;
    };

    this.dispose = function () {
      domElement.removeEventListener('contextmenu', onContextMenu, false);
      domElement.removeEventListener('mousedown',   onMouseDown,   false);
      domElement.removeEventListener('wheel',       onWheel,       false);
      domElement.removeEventListener('touchstart',  onTouchStart,  false);
      domElement.removeEventListener('touchmove',   onTouchMove,   false);
      domElement.removeEventListener('touchend',    onTouchEnd,    false);
    };

    this.update();
  }

  THREE.OrbitControls = OrbitControls;

})();
