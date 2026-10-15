// Lector de FBX binario (versiones 7.x). Devuelve el árbol de nodos
// { name, props, children } con arrays tipados. Sin dependencias externas:
// los arrays comprimidos (zlib) se descomprimen con DecompressionStream.

const MAGIC = "Kaydara FBX Binary  \0";
const HEADER_SIZE = 27;
const textDecoder = new TextDecoder();

// Nodos que el renderer estático no usa (animación y skinning); se saltan
// sin leerlos ni descomprimirlos.
const DEFAULT_SKIP = new Set([
  "AnimationCurve",
  "AnimationCurveNode",
  "AnimationLayer",
  "AnimationStack",
  "Deformer",
  "Pose",
  "Takes",
]);

const ARRAY_TYPES = {
  f: { size: 4, create: (buffer) => new Float32Array(buffer) },
  d: { size: 8, create: (buffer) => new Float64Array(buffer) },
  i: { size: 4, create: (buffer) => new Int32Array(buffer) },
  b: { size: 1, create: (buffer) => new Uint8Array(buffer) },
  // Los int64 se exponen como Float64 (exactos hasta 2^53, suficiente para ids y tiempos).
  l: { size: 8, create: (buffer) => Float64Array.from(new BigInt64Array(buffer), Number) },
};

async function inflate(bytes) {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate"));
  return new Response(stream).arrayBuffer();
}

export function isBinaryFBX(buffer) {
  if (buffer.byteLength < HEADER_SIZE) return false;
  const head = new Uint8Array(buffer, 0, MAGIC.length);
  return MAGIC.split("").every((char, i) => head[i] === char.charCodeAt(0));
}

export async function parseFBX(buffer, { skip = DEFAULT_SKIP } = {}) {
  if (!isBinaryFBX(buffer)) {
    throw new Error("Solo se soportan archivos FBX binarios");
  }
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  const version = view.getUint32(23, true);
  const wide = version >= 7500; // desde 7.5 los offsets son de 64 bits
  const word = wide ? 8 : 4;
  const recordSize = word * 3 + 1;
  const pending = [];
  let offset = HEADER_SIZE;

  const readUint = (at) => (wide ? Number(view.getBigUint64(at, true)) : view.getUint32(at, true));

  function readProperty(props) {
    const type = String.fromCharCode(bytes[offset++]);
    switch (type) {
      case "Y": { const v = view.getInt16(offset, true); offset += 2; return v; }
      case "C": return bytes[offset++] !== 0;
      case "I": { const v = view.getInt32(offset, true); offset += 4; return v; }
      case "F": { const v = view.getFloat32(offset, true); offset += 4; return v; }
      case "D": { const v = view.getFloat64(offset, true); offset += 8; return v; }
      case "L": { const v = Number(view.getBigInt64(offset, true)); offset += 8; return v; }
      case "S": {
        const length = view.getUint32(offset, true);
        const text = textDecoder.decode(bytes.subarray(offset + 4, offset + 4 + length));
        offset += 4 + length;
        return text;
      }
      case "R": {
        const length = view.getUint32(offset, true);
        const data = bytes.slice(offset + 4, offset + 4 + length);
        offset += 4 + length;
        return data;
      }
      case "f": case "d": case "i": case "b": case "l": {
        const arrayType = ARRAY_TYPES[type];
        const length = view.getUint32(offset, true);
        const encoding = view.getUint32(offset + 4, true);
        const compressedLength = view.getUint32(offset + 8, true);
        offset += 12;
        if (encoding === 0) {
          const data = buffer.slice(offset, offset + length * arrayType.size);
          offset += length * arrayType.size;
          return arrayType.create(data);
        }
        pending.push({
          props,
          index: props.length,
          arrayType,
          data: bytes.subarray(offset, offset + compressedLength),
        });
        offset += compressedLength;
        return null;
      }
      default:
        throw new Error(`Tipo de propiedad FBX desconocido: "${type}"`);
    }
  }

  function readNode() {
    const end = readUint(offset);
    if (end === 0) {
      offset += recordSize;
      return null;
    }
    const propertyCount = readUint(offset + word);
    const propertyBytes = readUint(offset + word * 2);
    const nameLength = bytes[offset + word * 3];
    offset += recordSize;
    const name = textDecoder.decode(bytes.subarray(offset, offset + nameLength));
    offset += nameLength;
    if (skip.has(name)) {
      offset = end;
      return { name, props: [], children: [] };
    }

    const propsEnd = offset + propertyBytes;
    const props = [];
    for (let i = 0; i < propertyCount; i++) props.push(readProperty(props));
    offset = propsEnd;

    const children = [];
    while (offset < end) {
      const child = readNode();
      if (!child) break;
      children.push(child);
    }
    offset = end;
    return { name, props, children };
  }

  const root = { name: "", props: [], children: [] };
  while (offset + recordSize <= bytes.length) {
    const node = readNode();
    if (!node) break;
    root.children.push(node);
  }

  await Promise.all(pending.map(async ({ props, index, arrayType, data }) => {
    props[index] = arrayType.create(await inflate(data));
  }));
  return root;
}

export function findChild(node, name) {
  return node.children.find((child) => child.name === name) || null;
}

export function findChildren(node, name) {
  return node.children.filter((child) => child.name === name);
}
