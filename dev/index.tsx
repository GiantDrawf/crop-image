import React, { useState, useRef, useReducer, createRef } from 'react';
import ReactDOM from 'react-dom';
import CropImage from '../lib/';
// @ts-ignore
import styles from './index.css';

function App() {
  const [urls, setUrl] = useState([
    'https://x0.ifengimg.com/ucms/2020_25/E96712A4369E8FE602BBFE8C9905BB434ABD7537_w600_h333.jpg'
    // 'https://x0.ifengimg.com/cmpp/2020/0703/e1bf4828dc2cb0csize1489_w552_h7755.jpg'
  ]);
  const [crops, setCrops] = useState({});

  const startCut = () => {
    console.log(crops);
  };

  const onCropsChange = (latestCrops, imageProperties) => {
    // console.log(latestCrops, imageProperties);
    setCrops(() => {
      return { ...latestCrops };
    });
  };

  return (
    <div className={styles.box}>
      {urls.map((itemUrl) => (
        <CropImage
          key={itemUrl}
          crops={crops}
          onCropsChange={onCropsChange}
          url={itemUrl}
          model="cut"
          customDepth={20}
        />
      ))}
      <button onClick={startCut}>开始裁剪</button>
    </div>
  );
}

ReactDOM.render(<App />, document.getElementById('root'));
