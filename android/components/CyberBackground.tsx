import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

interface CyberBackgroundProps {
  isPlaying?: boolean;
}

export const CyberBackground: React.FC<CyberBackgroundProps> = ({ isPlaying = true }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // 核心引用
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const rafRef = useRef<number>(0);
  
  // 交互与平滑状态 (Lerp 核心)
  const targetHandX = useRef<number | null>(null);
  const smoothHandX = useRef<number>(0.5); // 平滑后的坐标
  const lastGestureTimeRef = useRef(0);
  
  // 动力学状态
  const rotationSpeed = useRef(0.005);
  const energyLevel = useRef(0);

  // 监听手势事件
  useEffect(() => {
    const handleGesture = (e: any) => {
      targetHandX.current = e.detail.x;
      lastGestureTimeRef.current = Date.now();
    };
    window.addEventListener('gesture-move', handleGesture);
    return () => window.removeEventListener('gesture-move', handleGesture);
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    // --- 1. 环境初始化 ---
    const width = window.innerWidth;
    const height = window.innerHeight;
    const scene = new THREE.Scene();
    
    scene.fog = new THREE.FogExp2(0x000000, 0.01);

    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 25; 

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // --- 2. 构造内容组 ---
    const mainGroup = new THREE.Group();
    mainGroup.rotation.x = 0.3; // 保持稍微倾斜，增加立体感
    scene.add(mainGroup);

    // 材质定义
    const cyanMat = new THREE.LineBasicMaterial({ 
      color: 0x00ffff, 
      transparent: true, 
      opacity: 0.8,
      blending: THREE.AdditiveBlending 
    });
    
    // 默认几何体组 (Default Geometry Group)
    // 如果用户没有提供自定义模型，显示这个经典的 "回=回" 结构
    const defaultGroup = new THREE.Group();
    mainGroup.add(defaultGroup);

    // 1. 内核立方体
    const innerGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(8, 8, 8));
    const innerBox = new THREE.LineSegments(innerGeo, cyanMat.clone());
    defaultGroup.add(innerBox);

    // 2. 外层立方体
    const outerGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(16, 16, 16));
    const outerBox = new THREE.LineSegments(outerGeo, cyanMat.clone());
    defaultGroup.add(outerBox);

    // 3. 光环轨道
    const ringGeo = new THREE.TorusGeometry(22, 0.05, 16, 100);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.3 });
    const orbit = new THREE.Mesh(ringGeo, ringMat);
    orbit.rotation.x = Math.PI / 2;
    defaultGroup.add(orbit);

    // --- GLTF 加载逻辑 (自定义模型支持) ---
    // 用户可以将 'model.glb' 放入 android/public/ 目录来替换默认图形
    let customModel: THREE.Object3D | null = null;
    const loader = new GLTFLoader();
    
    // 尝试加载 (路径相对于 index.html)
    loader.load(
        'model.glb', 
        (gltf) => {
            console.log("Custom model loaded!");
            customModel = gltf.scene;
            
            // 归一化缩放 (Fit to size)
            const box = new THREE.Box3().setFromObject(customModel);
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = 20 / maxDim; // 缩放到约 20 单位大小
            customModel.scale.set(scale, scale, scale);
            
            // 应用材质 (可选：强制线框化以保持风格，或者保留原材质)
            customModel.traverse((child) => {
                if ((child as THREE.Mesh).isMesh) {
                    const mesh = child as THREE.Mesh;
                    // 强制转换为线框风格，保持 Cyberpunk 统一感
                    mesh.material = new THREE.MeshBasicMaterial({
                        color: 0x00ffff,
                        wireframe: true,
                        transparent: true,
                        opacity: 0.6,
                        blending: THREE.AdditiveBlending
                    });
                }
            });

            mainGroup.add(customModel);
            // 隐藏默认几何体
            defaultGroup.visible = false; 
        },
        undefined, 
        (err) => {
            // 加载失败 (通常是因为文件不存在)，保持显示默认几何体
            console.log("No custom model found, using default Kai-Kai.");
        }
    );

    // 背景粒子 (保持不变)
    const starCount = 800;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    for(let i=0; i<starCount * 3; i+=3) {
      starPos[i] = (Math.random() - 0.5) * 150;
      starPos[i+1] = (Math.random() - 0.5) * 150;
      starPos[i+2] = (Math.random() - 0.5) * 150;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({ size: 0.15, color: 0x44ffff, transparent: true, opacity: 0.4 });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    // --- 3. 核心动画循环 ---
    const animate = () => {
      const now = Date.now();
      
      // A. 手势坐标平滑
      if (targetHandX.current !== null && (now - lastGestureTimeRef.current < 400)) {
        smoothHandX.current += (targetHandX.current - smoothHandX.current) * 0.1;
        energyLevel.current += (1.0 - energyLevel.current) * 0.1;
      } else {
        energyLevel.current += (0.0 - energyLevel.current) * 0.05;
      }

      // B. 动力学计算
      const baseSpeed = isPlaying ? 0.005 : 0.001;
      const speed = baseSpeed + (energyLevel.current * 0.1);
      rotationSpeed.current += (speed - rotationSpeed.current) * 0.1;

      // C. 旋转应用
      if (customModel) {
          // 自定义模型旋转
          customModel.rotation.y += rotationSpeed.current;
          customModel.rotation.z += rotationSpeed.current * 0.5;
      } else {
          // 默认几何体旋转
          innerBox.rotation.y += rotationSpeed.current;
          innerBox.rotation.x += rotationSpeed.current * 0.5;
          outerBox.rotation.y -= rotationSpeed.current * 0.3; // 逆转
          outerBox.rotation.z += rotationSpeed.current * 0.2;
          orbit.rotation.z += rotationSpeed.current * 2;
      }

      // 背景粒子流动
      stars.rotation.y += 0.0005;
      stars.position.y -= isPlaying ? 0.1 : 0.02;
      if (stars.position.y < -50) stars.position.y = 50;

      // 整体交互反馈 (Parallax)
      mainGroup.rotation.z = (smoothHandX.current - 0.5) * 0.4;
      mainGroup.position.x = (smoothHandX.current - 0.5) * 8;

      // 颜色动态变化 (青 -> 金)
      const baseCol = new THREE.Color(0x00ffff);
      const activeCol = new THREE.Color(0xffaa00);
      const finalCol = baseCol.clone().lerp(activeCol, energyLevel.current);
      
      // 更新默认几何体颜色
      (innerBox.material as THREE.LineBasicMaterial).color.copy(finalCol);
      (outerBox.material as THREE.LineBasicMaterial).color.copy(finalCol);
      
      // 更新自定义模型颜色 (如果有)
      if (customModel) {
          customModel.traverse((child) => {
              if ((child as THREE.Mesh).isMesh) {
                  ((child as THREE.Mesh).material as THREE.MeshBasicMaterial).color.copy(finalCol);
              }
          });
      }

      renderer.render(scene, camera);
      rafRef.current = requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(rafRef.current);
      if (rendererRef.current && containerRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
      }
      
      // Dispose Resources
      innerBox.geometry.dispose();
      (innerBox.material as THREE.Material).dispose();
      
      outerBox.geometry.dispose();
      (outerBox.material as THREE.Material).dispose();
      
      orbit.geometry.dispose();
      (orbit.material as THREE.Material).dispose();

      stars.geometry.dispose();
      (stars.material as THREE.Material).dispose();
      
      cyanMat.dispose();

      // Dispose Custom Model if loaded
      if (customModel) {
          customModel.traverse((child) => {
              if ((child as THREE.Mesh).isMesh) {
                  const mesh = child as THREE.Mesh;
                  mesh.geometry.dispose();
                  if (Array.isArray(mesh.material)) {
                      mesh.material.forEach(m => m.dispose());
                  } else {
                      (mesh.material as THREE.Material).dispose();
                  }
              }
          });
      }
    };
  }, [isPlaying]); // 播放状态变化时重新运行以响应速度

  return (
    <div 
      ref={containerRef} 
      className="fixed inset-0 pointer-events-none"
    />
  );
};