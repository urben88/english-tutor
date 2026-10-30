import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

export interface LoadedModel {
  root: THREE.Object3D;
  bones: Map<string, THREE.Bone>;
  /** Meshes that carry morph targets. */
  morphMeshes: THREE.Mesh[];
  morphNames: Set<string>;
}

export async function loadModel(url: string): Promise<LoadedModel> {
  const gltf = await new GLTFLoader().loadAsync(url);
  const root = gltf.scene;
  const bones = new Map<string, THREE.Bone>();
  const morphMeshes: THREE.Mesh[] = [];
  const morphNames = new Set<string>();

  root.traverse((obj) => {
    if ((obj as THREE.Bone).isBone) bones.set(obj.name, obj as THREE.Bone);
    const mesh = obj as THREE.Mesh;
    if (mesh.isMesh) {
      mesh.frustumCulled = false; // skinned bounds do not follow the pose
      if (mesh.morphTargetDictionary && mesh.morphTargetInfluences) {
        morphMeshes.push(mesh);
        Object.keys(mesh.morphTargetDictionary).forEach((n) => morphNames.add(n));
      }
    }
  });

  if (bones.size === 0) throw new Error(`Model at ${url} has no skeleton`);
  return { root, bones, morphMeshes, morphNames };
}

export function disposeObject(root: THREE.Object3D): void {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.geometry?.dispose();
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const m of mats) {
      if (!m) continue;
      for (const value of Object.values(m)) {
        if (value instanceof THREE.Texture) value.dispose();
      }
      m.dispose();
    }
  });
}
