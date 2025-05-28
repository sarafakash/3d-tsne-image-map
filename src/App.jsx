import React, { useState, useEffect, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { ClipLoader } from "react-spinners"; // Simple spinner

function ImagePoint({ x, y, z, img, title, onSelect }) {
  const meshRef = useRef();
  const [texture, setTexture] = useState(null);
  const [hovered, setHovered] = useState(false);

useEffect(() => {
  let isMounted = true;
  const loader = new THREE.TextureLoader();
  const dataURL = `data:image/jpeg;base64,${img}`;

  loader.load(dataURL, (tex) => {
    if (isMounted) setTexture(tex);
  });

  return () => {
    isMounted = false;
    document.body.style.cursor = "default";
  };
}, [img]);

// Dispose texture on unmount only
useEffect(() => {
  return () => {
    if (texture) texture.dispose();
  };
}, []);


  const handleClick = () => {
    if (!meshRef.current) return;
    const worldPos = new THREE.Vector3();
    meshRef.current.getWorldPosition(worldPos);
    const cameraPos = worldPos.clone().add(new THREE.Vector3(0, 0, 1));
    onSelect({ cameraPos, lookAt: worldPos });
  };

  if (!texture) return null;

  return (
    <mesh
      position={[x, y, z]}
      scale={hovered ? 1.5 : 1}
      ref={meshRef}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = "pointer"; // Change cursor on hover
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = "default"; // Revert cursor
      }}
      onClick={(e) => {
        e.stopPropagation();
        handleClick();
      }}
    >
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        map={texture}
        transparent
        opacity={hovered ? 1 : 0.8}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}


function SceneContent({ data, targetRef, controlsRef, setIsZoomed }) {
  const { camera } = useThree();
  const [selectedId, setSelectedId] = useState(null);
  const defaultCamera = useRef({
    position: new THREE.Vector3(0, 0, 50),
    lookAt: new THREE.Vector3(0, 0, 0),
  });

  useFrame(() => {
    if (targetRef.current) {
      const { cameraPos, lookAt } = targetRef.current;
      camera.position.lerp(cameraPos, 0.2);
      camera.lookAt(lookAt);
      if (controlsRef.current) {
        controlsRef.current.target.lerp(lookAt, 0.2);
      }
      if (camera.position.distanceTo(cameraPos) < 0.1) {
        camera.position.copy(cameraPos);
        camera.lookAt(lookAt);
        if (controlsRef.current) {
          controlsRef.current.target.copy(lookAt);
          controlsRef.current.update();
        }
        targetRef.current = null;
        if (controlsRef.current) controlsRef.current.enableZoom = true;
      }
    }
  });

  const handleSelect = (target, id) => {
    if (controlsRef.current) controlsRef.current.enableZoom = false;
    if (selectedId === id) {
      targetRef.current = {
        cameraPos: defaultCamera.current.position.clone(),
        lookAt: defaultCamera.current.lookAt.clone(),
      };
      setSelectedId(null);
      setIsZoomed(false);
    } else {
      targetRef.current = target;
      setSelectedId(id);
      setIsZoomed(true);
    }
  };

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={0.3} />
      <OrbitControls
        ref={controlsRef}
        makeDefault
        minDistance={1}
        maxDistance={1000}
        enableDamping={false}
      />
      {data.map((item, idx) => (
        <ImagePoint
          key={idx}
          x={item.x}
          y={item.y}
          z={item.z}
          img={item.img}
          title={item.title}
          onSelect={(target) => handleSelect(target, idx)}
        />
      ))}
    </>
  );
}

function Scene({ data, setIsZoomed }) {
  const targetRef = useRef(null);
  const controlsRef = useRef(null);

  // Reset the camera to the initial zoomed-out position
  const handleReset = () => {
    if (controlsRef.current) {
      controlsRef.current.object.position.set(0, 0, 500);
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
      targetRef.current = null;
      setIsZoomed(false);
    }
  };

  // Zoom in the camera
  const handleZoomIn = () => {
    if (controlsRef.current) {
      targetRef.current = null; // Cancel any active camera transition
      controlsRef.current.enableZoom = true;
      controlsRef.current.object.translateZ(-50); // Zoom in
      controlsRef.current.update();
    }
  };

  // Zoom out the camera
  const handleZoomOut = () => {
    if (controlsRef.current) {
      targetRef.current = null;
      controlsRef.current.enableZoom = true;
      controlsRef.current.object.translateZ(50); // Zoom out
      controlsRef.current.update();
    }
  };

  const buttonStyle = {
    background: "#333",
    color: "#fff",
    border: "none",
    borderRadius: "10%",
    width: "45px",
    height: "45px",
    fontSize: "20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    marginBottom: "8px",
    zIndex: 20,
  };

  return (
    <>
      <div style={{ position: "absolute", top: "15px", right: "15px", zIndex: 20 }}>
        <button onClick={handleZoomIn} style={buttonStyle} title="Zoom In">➕</button>
        <button onClick={handleZoomOut} style={buttonStyle} title="Zoom Out">➖</button>
        <button onClick={handleReset} style={buttonStyle} title="Reset Zoom">🔁</button>
      </div>

      <Canvas
        style={{ position: "relative", zIndex: 2 }}
        camera={{ position: [0, 0, 300], fov: 90, near: 0.1, far: 1000 }}
      >
        <SceneContent
          data={data}
          targetRef={targetRef}
          controlsRef={controlsRef}
          setIsZoomed={setIsZoomed}
        />
      </Canvas>
    </>
  );
}




export default function App() {
  const [tsneData, setTsneData] = useState([]);
  const [isZoomed, setIsZoomed] = useState(false);
  const [chunkIndex, setChunkIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [renderingComplete, setRenderingComplete] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("🔮Art Work Map using Machine Learning ");
  const [dots, setDots] = useState(1); 
  const maxChunks = 180;

  
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev % 3) + 1); 
    }, 300); 

    return () => clearInterval(interval);
  }, []);

  
  const loadChunk = async (index) => {
    try {
      const response = await fetch(`/chunks/chunk_${index}.json`);
      if (response.ok) {
        const chunkData = await response.json();

        // Calculate average positions to center the data
        const avgX = chunkData.reduce((sum, d) => sum + d.x, 0) / chunkData.length;
        const avgY = chunkData.reduce((sum, d) => sum + d.y, 0) / chunkData.length;
        const avgZ = chunkData.reduce((sum, d) => sum + d.z, 0) / chunkData.length;

        // Increase the scale to spread points more and add slight random jitter
        const scale = 35;
        const jitter = () => (Math.random() - 0.5) * 2;
        const spacedData = chunkData.map((d) => ({
          ...d,
          x: (d.x - avgX) * scale + jitter(),
          y: (d.y - avgY) * scale + jitter(),
          z: (d.z - avgZ) * scale + jitter(),
        }));

        setTsneData((prev) => [...prev, ...spacedData]);

        // Setting the loading complete only after all chunks are loaded
        if (index >= maxChunks - 1) {
          setLoadingMessage("🔮Art Work Map using Machine Learning 🚀.");
          setLoading(false);

          // Introduce a slight delay to allow the rendering to catch up
          setTimeout(() => setRenderingComplete(true), 500);
        }
      }
    } catch (err) {
      console.error("Error loading chunk:", err);
    }
  };

  // Effect to Load Chunks
  useEffect(() => {
    if (chunkIndex < maxChunks) {
      const loadNextBatch = () => {
        loadChunk(chunkIndex);
        setChunkIndex((prev) => prev + 1);
      };
      requestAnimationFrame(loadNextBatch);
    }
  }, [chunkIndex]);

  return (
    <div
      style={{
        height: "100vh",
        width: "100vw",
        background: "linear-gradient(to bottom right, #444444, #000000)",
        position: "relative",
      }}
    >
      {(!renderingComplete || loading) && ( 
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            textAlign: "center",
            color: "white",
            zIndex: 10, 
          }}
        >
          <ClipLoader color="#ffffff" size={50} />
          <p>{`${loadingMessage}${".".repeat(dots)}`}</p> {/* Dynamic message */}
        </div>
      )}
      {!loading && tsneData.length > 0 && (
        <Scene data={tsneData} setIsZoomed={setIsZoomed} />
      )}
    </div>
  );
}



