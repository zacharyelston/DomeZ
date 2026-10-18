// Prints the viewer's meshes as JSON, for tests/test_viewer_parity.py:
//   node tests/js/dump_meshes.mjs '[{"method":"chords","freq":3,"partial":"3/4"}, …]'
// Each entry is a change to the viewer's defaults; the output is [{ pts, tris }, …] in metres, Z up.
import DomeZ, { design } from './load.mjs';

const specs = JSON.parse(process.argv[2] || '[]');
const meshes = specs.map((patch) => {
  const M = DomeZ.model.buildModel(design({ frame: 'struts', ...patch }));
  return { pts: M.pts, tris: M.tris };
});
process.stdout.write(JSON.stringify(meshes));
