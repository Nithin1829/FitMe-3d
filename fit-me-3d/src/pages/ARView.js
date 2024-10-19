import React, { useEffect, useState } from 'react';
import 'aframe';

function ARView() {
  const [measurements, setMeasurements] = useState(null);

  // Fetch measurements from the backend
  useEffect(() => {
    const fetchMeasurements = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:5001/api/measurements', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setMeasurements(data);
        } else {
          console.error('Failed to fetch m easurements');
        }
      } catch (error) {
        console.error('Error fetching measurements:', error);
      }
    };

    fetchMeasurements();
  }, []);

  return (
    <div>
      <h2>AR View</h2>

      {measurements ? (
        <a-scene
          embedded
          xrweb="tracked-pointer"
          arjs="sourceType: webcam; debugUIEnabled: false; trackingMethod: best;"
          renderer="antialias: true; colorManagement: true; alpha: true">
          
          <a-assets>
  <a-asset-item id="avatarModel" src="/public/untitled.glb" onerror="console.error('Failed to load model')"></a-asset-item>
</a-assets>
          {/* Place the model on the floor or detected surface */}
          <a-entity
            gltf-model="#avatarModel"
            position="0 0 0"
            scale={`${measurements.chest / 100} ${measurements.height / 200} ${measurements.waist / 100}`}
            rotation="0 180 0">
          </a-entity>

          {/* WebXR Camera for AR */}
          <a-camera-static></a-camera-static>
        </a-scene>
      ) : (
        <p>Loading AR model...</p>
      )}
    </div>
  );
}

export default ARView;