import * as THREE from 'three';
import {
	Canvas,
	extend,
	useFrame,
	useLoader,
	useThree,
	ReactThreeFiber,
} from '@react-three/fiber';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { Suspense, useCallback, useMemo, useRef } from 'react';
extend({ OrbitControls });
declare global {
	namespace JSX {
		interface IntrinsicElements {
			orbitControls: ReactThreeFiber.Object3DNode<
				OrbitControls,
				typeof OrbitControls
			>;
		}
	}
}

function CameraControls() {
	const {
		camera,
		gl: { domElement },
	} = useThree();

	const controlsRef: any = useRef();
	useFrame(() => controlsRef.current.update());

	return (
		<orbitControls
			ref={controlsRef}
			args={[camera, domElement]}
			autoRotate
			autoRotateSpeed={-0.2}
		/>
	);
}

function Points() {
	const imgTex = useLoader(THREE.TextureLoader, '/circle.png');
	const bufferRef: any = useRef();

	let t = 0;
	let f = 0.002;
	let a = 3;
	const graph = useCallback(
		(x, z) => {
			return Math.sin(f * (x ** 2 + z ** 2 + t)) * a;
		},
		[t, f, a]
	);

	const count = 100;
	const sep = 3;
	let positions = useMemo(() => {
		let positions = [];

		for (let xi = 0; xi < count; xi++) {
			for (let zi = 0; zi < count; zi++) {
				let x = sep * (xi - count / 2);
				let z = sep * (zi - count / 2);
				let y = graph(x, z);
				positions.push(x, y, z);
			}
		}

		return new Float32Array(positions);
	}, [count, sep, graph]);

	useFrame(() => {
		t += 15;

		const positions = bufferRef.current.array;

		let i = 0;
		for (let xi = 0; xi < count; xi++) {
			for (let zi = 0; zi < count; zi++) {
				let x = sep * (xi - count / 2);
				let z = sep * (zi - count / 2);

				positions[i + 1] = graph(x, z);
				i += 3;
			}
		}

		bufferRef.current.needsUpdate = true;
	});

	return (
		<points>
			<bufferGeometry attach='geometry'>
				<bufferAttribute
					attach='attributes-position'
					ref={bufferRef}
					array={positions}
					count={positions.length / 3}
					itemSize={3}
				/>
			</bufferGeometry>

			<pointsMaterial
				attach='material'
				map={imgTex as THREE.Texture}
				color={0x4b5563} // rgb(75, 85, 99) //rgb(147, 51, 234) #9333ea
				size={0.5}
				sizeAttenuation
				transparent={false}
				alphaTest={0.5}
				opacity={1.0}
			/>
		</points>
	);
}

function AnimationCanvas() {
	return (
		<Canvas camera={{ position: [100, 10, 0], fov: 75 }}>
			<Suspense fallback={null}>
				<Points />
			</Suspense>
			<CameraControls />
		</Canvas>
	);
}

export default function Ripple3D() {
	return (
		<div className='overflow-x-hidden box-border w-screen h-screen fixed top-0 left-0 -z-10'>
			<Suspense fallback={<div>Loading...</div>}>
				<AnimationCanvas />
			</Suspense>
			{/* <div className='w-screen h-screen'>
				<Canvas
					shadows={true}
					className='bg-black'
					camera={{
						position: [-6, 7, 7],
					}}
				>
					<ambientLight color={'white'} intensity={0.3} />
					<mesh position={[0, 3, 0]}>
						<pointLight castShadow />
						<sphereBufferGeometry args={[0.2, 30, 10]} />
						<meshPhongMaterial emissive={'yellow'} />
					</mesh>
					<mesh castShadow={true} receiveShadow={true}>
						<boxBufferGeometry />
						<meshPhysicalMaterial color={'white'} />
					</mesh>
					<mesh position={[0, -1, 0]} receiveShadow={true}>
						<boxBufferGeometry args={[20, 1, 10]} />
						<meshPhysicalMaterial color='white' />
					</mesh>
				</Canvas>
			</div> */}
		</div>
	);
}
