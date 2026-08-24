export const touch = {
  dx: 0,
  dy: 0,
  set(dx: number, dy: number) {
    this.dx = Math.sign(dx);
    this.dy = Math.sign(dy);
  },
  reset() {
    this.dx = 0;
    this.dy = 0;
  },
};
