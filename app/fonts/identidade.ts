
import localFont from "next/font/local";

/*
  ============================================
  NACIONAL DE RUA — IMIP
  IDENTIDADE TIPOGRÁFICA
  ============================================

  BOLD:
  Grandes títulos e subtítulos.

  VENEER W01 TWO:
  Frases de impacto e elementos urbanos.

  GEIST:
  Textos, tabelas, formulários e navegação.
  Já configurada em app/layout.tsx.

  INDUSTRIAL VOLTAGE:
  Retirada da identidade visual.
  ============================================
*/

export const boldIMIP = localFont({
  src: "./Bold.ttf",
  variable: "--font-imip-bold",
  display: "swap",
  weight: "700",
  style: "normal",
});

export const veneerIMIP = localFont({
  src: "./Veneer W01 Two.ttf",
  variable: "--font-imip-veneer",
  display: "swap",
  weight: "400",
  style: "normal",
});

/*
  Compatibilidade temporária com a homepage.

  A homepage anterior ainda importa
  industrialVoltage.

  Este alias permite que continue a funcionar,
  usando agora a fonte Bold, sem precisar
  do ficheiro Industrial Voltage.ttf.

  Será retirado quando atualizarmos
  o código da homepage.
*/

export const industrialVoltage = boldIMIP;

/*
  ============================================
  CLASSES TIPOGRÁFICAS REUTILIZÁVEIS
  ============================================
*/

export const tipografiaIMIP = {
  principal: [
    boldIMIP.className,
    "min-w-0",
    "max-w-full",
    "font-bold",
    "uppercase",
    "leading-[1.08]",
    "tracking-[0.015em]",
    "text-[clamp(2.6rem,5.5vw,6.2rem)]",
    "[overflow-wrap:break-word]",
  ].join(" "),

  secao: [
    boldIMIP.className,
    "min-w-0",
    "max-w-full",
    "font-bold",
    "uppercase",
    "leading-[1.12]",
    "tracking-[0.015em]",
    "text-[clamp(1.8rem,3.2vw,3.5rem)]",
    "[overflow-wrap:break-word]",
  ].join(" "),

  cartao: [
    boldIMIP.className,
    "min-w-0",
    "font-bold",
    "uppercase",
    "leading-[1.15]",
    "tracking-[0.01em]",
    "text-[clamp(1.3rem,2vw,2rem)]",
    "[overflow-wrap:break-word]",
  ].join(" "),

  frase: [
    veneerIMIP.className,
    "font-normal",
    "uppercase",
    "leading-[1.12]",
    "tracking-[0.02em]",
    "text-[clamp(1.5rem,2.5vw,2.8rem)]",
    "[overflow-wrap:break-word]",
  ].join(" "),

  numero: [
    boldIMIP.className,
    "font-bold",
    "leading-none",
    "tracking-normal",
    "tabular-nums",
  ].join(" "),

  interface: [
    "font-bold",
    "text-xs",
    "uppercase",
    "tracking-[0.06em]",
    "leading-relaxed",
  ].join(" "),

  texto: [
    "text-sm",
    "leading-relaxed",
    "sm:text-base",
  ].join(" "),
} as const;
