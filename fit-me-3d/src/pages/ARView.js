import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { Camera } from '@mediapipe/camera_utils';
import { Holistic } from '@mediapipe/holistic';

function ARViewer() {
  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [error, setError] = useState(null);
  const [measurements, setMeasurements] = useState(null);

  useEffect(() => {
    let camera, scene, renderer;
    let model;
    let mediaCamera;

    const initThreeJS = () => {
      scene = new THREE.Scene();

      camera = new THREE.PerspectiveCamera(
        45,
        window.innerWidth / window.innerHeight,
        1,
        2000
      );
      camera.position.z = 300;

      renderer = new THREE.WebGLRenderer({ alpha: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(window.devicePixelRatio);
      containerRef.current.appendChild(renderer.domElement);

      const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
      scene.add(ambientLight);

      const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
      directionalLight.position.set(0, 200, 100);
      scene.add(directionalLight);
    };

    const loadModel = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:5001/api/measurements', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch model data');
        }

        const data = await response.json();
        setMeasurements(data.measurements);
        const modelPath = `http://localhost:5001${data.gltfFile}`;

        const loader = new GLTFLoader();
        loader.load(
          modelPath,
          (gltf) => {
            model = gltf.scene;
            
            // Get model's original bounding box
            const bbox = new THREE.Box3().setFromObject(model);
            const originalDimensions = {
              height: bbox.max.y - bbox.min.y,
              width: bbox.max.x - bbox.min.x,
              depth: bbox.max.z - bbox.min.z
            };

            // Calculate scale factors based on measurements
            const scaleFactors = {
              y: (data.measurements.height) / originalDimensions.height,
              x: (data.measurements.waist) / originalDimensions.width,
              z: (data.measurements.chest) / originalDimensions.depth
            };

            // Apply scaling
            model.scale.set(scaleFactors.x, scaleFactors.y, scaleFactors.z);

            // Recalculate bounding box after scaling
            bbox.setFromObject(model);
            const center = bbox.getCenter(new THREE.Vector3());
            model.position.sub(center);

            // Center vertically and adjust position
            model.position.y += data.measurements.height / 2;
            model.rotation.y = Math.PI; // Face the camera

            scene.add(model);
            setLoading(false);
          },
          (xhr) => {
            const progress = (xhr.loaded / xhr.total * 100);
            setLoadingProgress(progress);
          },
          (error) => {
            console.error('Error loading model:', error);
            setError('Failed to load model');
          }
        );
      } catch (error) {
        console.error('Error:', error);
        setError(error.message);
      }
    };

    const setupMediaPipe = () => {
      const holistic = new Holistic({
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/holistic/${file}`;
        }
      });

      holistic.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: true,
        smoothSegmentation: true,
        refineFaceLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });

      holistic.onResults((results) => {
        if (results.poseLandmarks && model) {
          const nose = results.poseLandmarks[0];
          if (nose) {
            // Adjusted position calculations for human-sized model
            model.position.x = (nose.x - 0.5) * 500;
            model.position.y = ((0.5 - nose.y) * 500) + measurements?.height / 2;
            model.position.z = -nose.z * 300;
          }
        }
      });

      mediaCamera = new Camera(videoRef.current, {
        onFrame: async () => {
          await holistic.send({
            image: videoRef.current
          });
        },
        width: 1280,
        height: 720
      });
      mediaCamera.start();
    };

    const animate = () => {
      requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };

    initThreeJS();
    loadModel();
    setupMediaPipe();
    animate();

    const handleResize = () => {
      if (!containerRef.current) return;
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (mediaCamera) {
        mediaCamera.stop();
      }
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, [measurements]);

  return (
    <div className="relative h-screen w-screen">
      <video
        ref={videoRef}
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      />
      <div
        ref={containerRef}
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
        }}
      />
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-10">
          <div className="text-white text-xl">
            Loading AR Experience: {Math.round(loadingProgress)}%
          </div>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-10">
          <div className="text-red-500 text-xl bg-white p-4 rounded-lg">
            Error: {error}
          </div>
        </div>
      )}
    </div>
  );
}

export default ARViewer;
