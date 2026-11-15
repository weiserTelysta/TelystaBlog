import { useEffect, useRef } from 'react';
import { startStarfield, type StarfieldVariant } from './starfieldRuntime';
import './StarfieldBackground.css';

export default function StarfieldBackground({ variant = 'immersive' }: { variant?: StarfieldVariant }) {
 const canvasRef = useRef<HTMLCanvasElement>(null);
 useEffect(() => {
  const canvas = canvasRef.current;
  if (canvas) return startStarfield(canvas, variant);
 }, [variant]);
 return <div className="starfield" aria-hidden="true"><canvas ref={canvasRef} className="starfield__canvas" /></div>;
}
