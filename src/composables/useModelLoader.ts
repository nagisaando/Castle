import * as THREE from "three";
import { DRACOLoader, GLTFLoader } from "three/examples/jsm/Addons.js";

export interface ModelLoaderSetup {
  loadModel: (
    url: string,
    onProgress: (progress: number) => void
  ) => Promise<THREE.Group>;
  loadAllModels: (
    onProgress: (progress: number, index: number) => void
  ) => Promise<LoadedModels>;
}

export interface LoadedModels {
  doorLeftNob: THREE.Group;
  doorRightNob: THREE.Group;
  castle: THREE.Group;
  room: THREE.Group;
  fakeTree: THREE.Group;
  mouse: THREE.Group;
  shuriken: THREE.Group;
  catFeet: THREE.Group;
}

export function useModelLoader(): ModelLoaderSetup {
  // Setup GLTF and DRACO loaders
  const gltfLoader = new GLTFLoader();
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath("/draco/");
  gltfLoader.setDRACOLoader(dracoLoader);

  const loadModel = (
    url: string,
    onProgress: (progress: number) => void
  ): Promise<THREE.Group> => {
    return new Promise((resolve, reject) => {
      gltfLoader.load(
        url,
        (gltf) => {
          onProgress(100); // Ensure it reports 100% on completion
          resolve(gltf.scene);
        },
        (xhr) => {
          if (xhr.lengthComputable) {
            const percentage = Math.min((xhr.loaded / xhr.total) * 100, 100); // Clamp progress to 100
            onProgress(percentage);
          }
        },
        (err) => reject(err)
      );
    });
  };

  const loadAllModels = async (
    onProgress: (progress: number, index: number) => void
  ): Promise<LoadedModels> => {
    const modelsToLoad = [
      "/model/left-door-nob/door.gltf",
      "/model/right-door-nob/door.gltf",
      "/model/castle/castle.gltf",
      "/model/interior/interior.gltf",
      "/model/tree-fake/tree-fake.gltf",
      "/model/mouse/mouse.gltf",
      "/model/shuriken/shuriken.gltf",
      "/model/cat-feet/cat-feet.gltf",
    ];

    const [
      doorLeftNob,
      doorRightNob,
      castle,
      room,
      fakeTree,
      mouse,
      shuriken,
      catFeet,
    ] = await Promise.all(
      modelsToLoad.map((url, index) =>
        loadModel(url, (progress) => {
          onProgress(progress, index);
        })
      )
    );

    return {
      doorLeftNob,
      doorRightNob,
      castle,
      room,
      fakeTree,
      mouse,
      shuriken,
      catFeet,
    };
  };

  return {
    loadModel,
    loadAllModels,
  };
}
