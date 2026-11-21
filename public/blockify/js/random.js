// Cópia exata do kotlin.random.Random(seed) (XorWow do Kotlin).
// Com a mesma semente, gera os mesmos números que o app Android: as fases ficam idênticas.

export class KRandom {
  /** seed: número inteiro (até 2^53) ou BigInt, como o Long do Kotlin. */
  constructor(seed) {
    const big = BigInt.asIntN(64, BigInt(seed));
    const seed1 = Number(BigInt.asIntN(32, big));
    const seed2 = Number(BigInt.asIntN(32, big >> 32n));
    this.x = seed1 | 0;
    this.y = seed2 | 0;
    this.z = 0;
    this.w = 0;
    this.v = ~seed1 | 0;
    this.addend = ((seed1 << 10) ^ (seed2 >>> 4)) | 0;
    for (let i = 0; i < 64; i++) this.nextInt32();
  }

  nextInt32() {
    let t = this.x;
    t = t ^ (t >>> 2);
    this.x = this.y;
    this.y = this.z;
    this.z = this.w;
    const v0 = this.v;
    this.w = v0;
    t = (t ^ (t << 1)) ^ v0 ^ (v0 << 4);
    this.v = t | 0;
    this.addend = (this.addend + 362437) | 0;
    return (t + this.addend) | 0;
  }

  nextBits(bitCount) {
    const x = this.nextInt32();
    return (x >>> (32 - bitCount)) & (-bitCount >> 31);
  }

  /** Igual a Random.nextInt(until) do Kotlin. */
  nextInt(until) {
    const n = until | 0;
    if (n <= 0) throw new Error("bound must be positive");
    if ((n & -n) === n) {
      const bitCount = 31 - Math.clz32(n);
      return this.nextBits(bitCount);
    }
    let bits, v;
    do {
      bits = this.nextInt32() >>> 1;
      v = bits % n;
    } while (((bits - v + (n - 1)) | 0) < 0);
    return v;
  }

  nextFloat() {
    return this.nextBits(24) / (1 << 24);
  }

  /** Igual a MutableList.shuffle(random) do Kotlin. */
  shuffle(list) {
    for (let i = list.length - 1; i >= 1; i--) {
      const j = this.nextInt(i + 1);
      const tmp = list[i];
      list[i] = list[j];
      list[j] = tmp;
    }
  }
}

/** Semente aleatória para partidas normais (como System.nanoTime() no Android). */
export function randomSeed() {
  return Math.floor(Math.random() * 2 ** 31) * 2 ** 21 + Math.floor(Math.random() * 2 ** 21);
}
