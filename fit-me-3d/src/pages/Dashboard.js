import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function Dashboard() {
  const [height, setHeight] = useState('');  // if you don't use setHeight, remove it
  const [chest, setChest] = useState('');    // if unused, remove setChest
  const [waist, setWaist] = useState('');    // if unused, remove setWaist
  const [hips, setHips] = useState('');      // if unused, remove setHips
  const [clothingLink, setClothingLink] = useState('');  // if unused, remove setClothingLink

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    const token = localStorage.getItem('token');
    const data = { height, chest, waist, hips, clothingLink };

    try {
      const response = await fetch('http://localhost:5001/api/measurements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        navigate('/arview');
      } else {
        console.error('Error saving measurements.');
      }
    } catch (error) {
      console.error('Server error.');
    }
  };

  return (
    <div>
      <h2>Enter Your Measurements</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Height (cm):</label>
          <input
            type="number"
            value={height}
            onChange={(e) => setHeight(e.target.value)}
            required
          />
        </div>
        <div>
          <label>Chest (cm):</label>
          <input
            type="number"
            value={chest}
            onChange={(e) => setChest(e.target.value)}
            required
          />
        </div>
        <div>
          <label>Waist (cm):</label>
          <input
            type="number"
            value={waist}
            onChange={(e) => setWaist(e.target.value)}
            required
          />
        </div>
        <div>
          <label>Hips (cm):</label>
          <input
            type="number"
            value={hips}
            onChange={(e) => setHips(e.target.value)}
            required
          />
        </div>
        <div>
          <label>Clothing Link:</label>
          <input
            type="url"
            value={clothingLink}
            onChange={(e) => setClothingLink(e.target.value)}
            required
          />
        </div>
        <button type="submit">Create My AR</button>
      </form>
    </div>
  );
}

export default Dashboard;