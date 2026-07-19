declare module 'colorthief' {
  type RGB = [number, number, number];
  export default class ColorThief {
    getColor(img: HTMLImageElement | null, quality?: number): RGB;
    getPalette(
      img: HTMLImageElement | null,
      colorCount?: number,
      quality?: number,
    ): RGB[];
  }
}
