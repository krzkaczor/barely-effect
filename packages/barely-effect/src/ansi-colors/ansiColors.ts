function color(open: number, close: number) {
  const openCode = `\x1b[${open}m`
  const closeCode = `\x1b[${close}m`
  return (text: string) => openCode + text.replaceAll("\n", `${closeCode}\n${openCode}`) + closeCode
}

export const ansiColors = {
  red: color(31, 39),
  green: color(32, 39),
  yellow: color(33, 39),
  blue: color(34, 39),
  magenta: color(35, 39),
  cyan: color(36, 39),
  gray: color(90, 39),
  bold: color(1, 22),
}
