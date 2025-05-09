export type OverloadedFunctionSignatures<T> = T extends {
  (...args: infer A1): infer R1;
  (...args: infer A2): infer R2;
  (...args: infer A3): infer R3;
  (...args: infer A4): infer R4;
  (...args: infer A5): infer R5;
}
  ? ((...args: A1) => R1) &
      ((...args: A2) => R2) &
      ((...args: A3) => R3) &
      ((...args: A4) => R4) &
      ((...args: A5) => R5)
  : T extends {
      (...args: infer A1): infer R1;
      (...args: infer A2): infer R2;
      (...args: infer A3): infer R3;
      (...args: infer A4): infer R4;
    }
  ? ((...args: A1) => R1) &
      ((...args: A2) => R2) &
      ((...args: A3) => R3) &
      ((...args: A4) => R4)
  : T extends {
      (...args: infer A1): infer R1;
      (...args: infer A2): infer R2;
      (...args: infer A3): infer R3;
    }
  ? ((...args: A1) => R1) & ((...args: A2) => R2) & ((...args: A3) => R3)
  : T extends {
      (...args: infer A1): infer R1;
      (...args: infer A2): infer R2;
    }
  ? ((...args: A1) => R1) & ((...args: A2) => R2)
  : T extends (...args: infer A) => infer R
  ? (...args: A) => R
  : never;

// export type OverloadedFunctionSignatures<T> = T extends {
//   (...args: infer A1): infer R1;
//   (...args: infer A2): infer R2;
//   (...args: infer A3): infer R3;
//   (...args: infer A4): infer R4;
//   (...args: infer A5): infer R5;
//   (...args: infer A6): infer R6;
//   (...args: infer A7): infer R7;
//   (...args: infer A8): infer R8;
//   (...args: infer A9): infer R9;
//   (...args: infer A10): infer R10;
//   (...args: infer A11): infer R11;
//   (...args: infer A12): infer R12;
//   (...args: infer A13): infer R13;
//   (...args: infer A14): infer R14;
//   (...args: infer A15): infer R15;
//   (...args: infer A16): infer R16;
//   (...args: infer A17): infer R17;
//   (...args: infer A18): infer R18;
//   (...args: infer A19): infer R19;
//   (...args: infer A20): infer R20;
//   (...args: infer A21): infer R21;
//   (...args: infer A22): infer R22;
//   (...args: infer A23): infer R23;
//   (...args: infer A24): infer R24;
//   (...args: infer A25): infer R25;
// }
//   ? ((...args: A1) => R1) &
//       ((...args: A2) => R2) &
//       ((...args: A3) => R3) &
//       ((...args: A4) => R4) &
//       ((...args: A5) => R5) &
//       ((...args: A6) => R6) &
//       ((...args: A7) => R7) &
//       ((...args: A8) => R8) &
//       ((...args: A9) => R9) &
//       ((...args: A10) => R10) &
//       ((...args: A11) => R11) &
//       ((...args: A12) => R12) &
//       ((...args: A13) => R13) &
//       ((...args: A14) => R14) &
//       ((...args: A15) => R15) &
//       ((...args: A16) => R16) &
//       ((...args: A17) => R17) &
//       ((...args: A18) => R18) &
//       ((...args: A19) => R19) &
//       ((...args: A20) => R20) &
//       ((...args: A21) => R21) &
//       ((...args: A22) => R22) &
//       ((...args: A23) => R23) &
//       ((...args: A24) => R24) &
//       ((...args: A25) => R25)
//   : T extends {
//       (...args: infer A1): infer R1;
//       (...args: infer A2): infer R2;
//       (...args: infer A3): infer R3;
//       (...args: infer A4): infer R4;
//       (...args: infer A5): infer R5;
//       (...args: infer A6): infer R6;
//       (...args: infer A7): infer R7;
//       (...args: infer A8): infer R8;
//       (...args: infer A9): infer R9;
//       (...args: infer A10): infer R10;
//       (...args: infer A11): infer R11;
//       (...args: infer A12): infer R12;
//       (...args: infer A13): infer R13;
//       (...args: infer A14): infer R14;
//       (...args: infer A15): infer R15;
//       (...args: infer A16): infer R16;
//       (...args: infer A17): infer R17;
//       (...args: infer A18): infer R18;
//       (...args: infer A19): infer R19;
//       (...args: infer A20): infer R20;
//       (...args: infer A21): infer R21;
//       (...args: infer A22): infer R22;
//       (...args: infer A23): infer R23;
//       (...args: infer A24): infer R24;
//     }
//   ? ((...args: A1) => R1) &
//       ((...args: A2) => R2) &
//       ((...args: A3) => R3) &
//       ((...args: A4) => R4) &
//       ((...args: A5) => R5) &
//       ((...args: A6) => R6) &
//       ((...args: A7) => R7) &
//       ((...args: A8) => R8) &
//       ((...args: A9) => R9) &
//       ((...args: A10) => R10) &
//       ((...args: A11) => R11) &
//       ((...args: A12) => R12) &
//       ((...args: A13) => R13) &
//       ((...args: A14) => R14) &
//       ((...args: A15) => R15) &
//       ((...args: A16) => R16) &
//       ((...args: A17) => R17) &
//       ((...args: A18) => R18) &
//       ((...args: A19) => R19) &
//       ((...args: A20) => R20) &
//       ((...args: A21) => R21) &
//       ((...args: A22) => R22) &
//       ((...args: A23) => R23) &
//       ((...args: A24) => R24)
//   : T extends {
//       (...args: infer A1): infer R1;
//       (...args: infer A2): infer R2;
//       (...args: infer A3): infer R3;
//       (...args: infer A4): infer R4;
//       (...args: infer A5): infer R5;
//       (...args: infer A6): infer R6;
//       (...args: infer A7): infer R7;
//       (...args: infer A8): infer R8;
//       (...args: infer A9): infer R9;
//       (...args: infer A10): infer R10;
//       (...args: infer A11): infer R11;
//       (...args: infer A12): infer R12;
//       (...args: infer A13): infer R13;
//       (...args: infer A14): infer R14;
//       (...args: infer A15): infer R15;
//       (...args: infer A16): infer R16;
//       (...args: infer A17): infer R17;
//       (...args: infer A18): infer R18;
//       (...args: infer A19): infer R19;
//       (...args: infer A20): infer R20;
//       (...args: infer A21): infer R21;
//       (...args: infer A22): infer R22;
//       (...args: infer A23): infer R23;
//     }
//   ? ((...args: A1) => R1) &
//       ((...args: A2) => R2) &
//       ((...args: A3) => R3) &
//       ((...args: A4) => R4) &
//       ((...args: A5) => R5) &
//       ((...args: A6) => R6) &
//       ((...args: A7) => R7) &
//       ((...args: A8) => R8) &
//       ((...args: A9) => R9) &
//       ((...args: A10) => R10) &
//       ((...args: A11) => R11) &
//       ((...args: A12) => R12) &
//       ((...args: A13) => R13) &
//       ((...args: A14) => R14) &
//       ((...args: A15) => R15) &
//       ((...args: A16) => R16) &
//       ((...args: A17) => R17) &
//       ((...args: A18) => R18) &
//       ((...args: A19) => R19) &
//       ((...args: A20) => R20) &
//       ((...args: A21) => R21) &
//       ((...args: A22) => R22) &
//       ((...args: A23) => R23)
//   : T extends {
//       (...args: infer A1): infer R1;
//       (...args: infer A2): infer R2;
//       (...args: infer A3): infer R3;
//       (...args: infer A4): infer R4;
//       (...args: infer A5): infer R5;
//       (...args: infer A6): infer R6;
//       (...args: infer A7): infer R7;
//       (...args: infer A8): infer R8;
//       (...args: infer A9): infer R9;
//       (...args: infer A10): infer R10;
//       (...args: infer A11): infer R11;
//       (...args: infer A12): infer R12;
//       (...args: infer A13): infer R13;
//       (...args: infer A14): infer R14;
//       (...args: infer A15): infer R15;
//       (...args: infer A16): infer R16;
//       (...args: infer A17): infer R17;
//       (...args: infer A18): infer R18;
//       (...args: infer A19): infer R19;
//       (...args: infer A20): infer R20;
//       (...args: infer A21): infer R21;
//       (...args: infer A22): infer R22;
//     }
//   ? ((...args: A1) => R1) &
//       ((...args: A2) => R2) &
//       ((...args: A3) => R3) &
//       ((...args: A4) => R4) &
//       ((...args: A5) => R5) &
//       ((...args: A6) => R6) &
//       ((...args: A7) => R7) &
//       ((...args: A8) => R8) &
//       ((...args: A9) => R9) &
//       ((...args: A10) => R10) &
//       ((...args: A11) => R11) &
//       ((...args: A12) => R12) &
//       ((...args: A13) => R13) &
//       ((...args: A14) => R14) &
//       ((...args: A15) => R15) &
//       ((...args: A16) => R16) &
//       ((...args: A17) => R17) &
//       ((...args: A18) => R18) &
//       ((...args: A19) => R19) &
//       ((...args: A20) => R20) &
//       ((...args: A21) => R21) &
//       ((...args: A22) => R22)
//   : T extends {
//       (...args: infer A1): infer R1;
//       (...args: infer A2): infer R2;
//       (...args: infer A3): infer R3;
//       (...args: infer A4): infer R4;
//       (...args: infer A5): infer R5;
//       (...args: infer A6): infer R6;
//       (...args: infer A7): infer R7;
//       (...args: infer A8): infer R8;
//       (...args: infer A9): infer R9;
//       (...args: infer A10): infer R10;
//       (...args: infer A11): infer R11;
//       (...args: infer A12): infer R12;
//       (...args: infer A13): infer R13;
//       (...args: infer A14): infer R14;
//       (...args: infer A15): infer R15;
//       (...args: infer A16): infer R16;
//       (...args: infer A17): infer R17;
//       (...args: infer A18): infer R18;
//       (...args: infer A19): infer R19;
//       (...args: infer A20): infer R20;
//       (...args: infer A21): infer R21;
//     }
//   ? ((...args: A1) => R1) &
//       ((...args: A2) => R2) &
//       ((...args: A3) => R3) &
//       ((...args: A4) => R4) &
//       ((...args: A5) => R5) &
//       ((...args: A6) => R6) &
//       ((...args: A7) => R7) &
//       ((...args: A8) => R8) &
//       ((...args: A9) => R9) &
//       ((...args: A10) => R10) &
//       ((...args: A11) => R11) &
//       ((...args: A12) => R12) &
//       ((...args: A13) => R13) &
//       ((...args: A14) => R14) &
//       ((...args: A15) => R15) &
//       ((...args: A16) => R16) &
//       ((...args: A17) => R17) &
//       ((...args: A18) => R18) &
//       ((...args: A19) => R19) &
//       ((...args: A20) => R20) &
//       ((...args: A21) => R21)
//   : T extends {
//       (...args: infer A1): infer R1;
//       (...args: infer A2): infer R2;
//       (...args: infer A3): infer R3;
//       (...args: infer A4): infer R4;
//       (...args: infer A5): infer R5;
//       (...args: infer A6): infer R6;
//       (...args: infer A7): infer R7;
//       (...args: infer A8): infer R8;
//       (...args: infer A9): infer R9;
//       (...args: infer A10): infer R10;
//       (...args: infer A11): infer R11;
//       (...args: infer A12): infer R12;
//       (...args: infer A13): infer R13;
//       (...args: infer A14): infer R14;
//       (...args: infer A15): infer R15;
//       (...args: infer A16): infer R16;
//       (...args: infer A17): infer R17;
//       (...args: infer A18): infer R18;
//       (...args: infer A19): infer R19;
//       (...args: infer A20): infer R20;
//     }
//   ? ((...args: A1) => R1) &
//       ((...args: A2) => R2) &
//       ((...args: A3) => R3) &
//       ((...args: A4) => R4) &
//       ((...args: A5) => R5) &
//       ((...args: A6) => R6) &
//       ((...args: A7) => R7) &
//       ((...args: A8) => R8) &
//       ((...args: A9) => R9) &
//       ((...args: A10) => R10) &
//       ((...args: A11) => R11) &
//       ((...args: A12) => R12) &
//       ((...args: A13) => R13) &
//       ((...args: A14) => R14) &
//       ((...args: A15) => R15) &
//       ((...args: A16) => R16) &
//       ((...args: A17) => R17) &
//       ((...args: A18) => R18) &
//       ((...args: A19) => R19) &
//       ((...args: A20) => R20)
//   : T extends {
//       (...args: infer A1): infer R1;
//       (...args: infer A2): infer R2;
//       (...args: infer A3): infer R3;
//       (...args: infer A4): infer R4;
//       (...args: infer A5): infer R5;
//       (...args: infer A6): infer R6;
//       (...args: infer A7): infer R7;
//       (...args: infer A8): infer R8;
//       (...args: infer A9): infer R9;
//       (...args: infer A10): infer R10;
//       (...args: infer A11): infer R11;
//       (...args: infer A12): infer R12;
//       (...args: infer A13): infer R13;
//       (...args: infer A14): infer R14;
//       (...args: infer A15): infer R15;
//       (...args: infer A16): infer R16;
//       (...args: infer A17): infer R17;
//       (...args: infer A18): infer R18;
//       (...args: infer A19): infer R19;
//     }
//   ? ((...args: A1) => R1) &
//       ((...args: A2) => R2) &
//       ((...args: A3) => R3) &
//       ((...args: A4) => R4) &
//       ((...args: A5) => R5) &
//       ((...args: A6) => R6) &
//       ((...args: A7) => R7) &
//       ((...args: A8) => R8) &
//       ((...args: A9) => R9) &
//       ((...args: A10) => R10) &
//       ((...args: A11) => R11) &
//       ((...args: A12) => R12) &
//       ((...args: A13) => R13) &
//       ((...args: A14) => R14) &
//       ((...args: A15) => R15) &
//       ((...args: A16) => R16) &
//       ((...args: A17) => R17) &
//       ((...args: A18) => R18) &
//       ((...args: A19) => R19)
//   : T extends {
//       (...args: infer A1): infer R1;
//       (...args: infer A2): infer R2;
//       (...args: infer A3): infer R3;
//       (...args: infer A4): infer R4;
//       (...args: infer A5): infer R5;
//       (...args: infer A6): infer R6;
//       (...args: infer A7): infer R7;
//       (...args: infer A8): infer R8;
//       (...args: infer A9): infer R9;
//       (...args: infer A10): infer R10;
//       (...args: infer A11): infer R11;
//       (...args: infer A12): infer R12;
//       (...args: infer A13): infer R13;
//       (...args: infer A14): infer R14;
//       (...args: infer A15): infer R15;
//       (...args: infer A16): infer R16;
//       (...args: infer A17): infer R17;
//       (...args: infer A18): infer R18;
//     }
//   ? ((...args: A1) => R1) &
//       ((...args: A2) => R2) &
//       ((...args: A3) => R3) &
//       ((...args: A4) => R4) &
//       ((...args: A5) => R5) &
//       ((...args: A6) => R6) &
//       ((...args: A7) => R7) &
//       ((...args: A8) => R8) &
//       ((...args: A9) => R9) &
//       ((...args: A10) => R10) &
//       ((...args: A11) => R11) &
//       ((...args: A12) => R12) &
//       ((...args: A13) => R13) &
//       ((...args: A14) => R14) &
//       ((...args: A15) => R15) &
//       ((...args: A16) => R16) &
//       ((...args: A17) => R17) &
//       ((...args: A18) => R18)
//   : T extends {
//       (...args: infer A1): infer R1;
//       (...args: infer A2): infer R2;
//       (...args: infer A3): infer R3;
//       (...args: infer A4): infer R4;
//       (...args: infer A5): infer R5;
//       (...args: infer A6): infer R6;
//       (...args: infer A7): infer R7;
//       (...args: infer A8): infer R8;
//       (...args: infer A9): infer R9;
//       (...args: infer A10): infer R10;
//       (...args: infer A11): infer R11;
//       (...args: infer A12): infer R12;
//       (...args: infer A13): infer R13;
//       (...args: infer A14): infer R14;
//       (...args: infer A15): infer R15;
//       (...args: infer A16): infer R16;
//       (...args: infer A17): infer R17;
//     }
//   ? ((...args: A1) => R1) &
//       ((...args: A2) => R2) &
//       ((...args: A3) => R3) &
//       ((...args: A4) => R4) &
//       ((...args: A5) => R5) &
//       ((...args: A6) => R6) &
//       ((...args: A7) => R7) &
//       ((...args: A8) => R8) &
//       ((...args: A9) => R9) &
//       ((...args: A10) => R10) &
//       ((...args: A11) => R11) &
//       ((...args: A12) => R12) &
//       ((...args: A13) => R13) &
//       ((...args: A14) => R14) &
//       ((...args: A15) => R15) &
//       ((...args: A16) => R16) &
//       ((...args: A17) => R17)
//   : T extends {
//       (...args: infer A1): infer R1;
//       (...args: infer A2): infer R2;
//       (...args: infer A3): infer R3;
//       (...args: infer A4): infer R4;
//       (...args: infer A5): infer R5;
//       (...args: infer A6): infer R6;
//       (...args: infer A7): infer R7;
//       (...args: infer A8): infer R8;
//       (...args: infer A9): infer R9;
//       (...args: infer A10): infer R10;
//       (...args: infer A11): infer R11;
//       (...args: infer A12): infer R12;
//       (...args: infer A13): infer R13;
//       (...args: infer A14): infer R14;
//       (...args: infer A15): infer R15;
//       (...args: infer A16): infer R16;
//     }
//   ? ((...args: A1) => R1) &
//       ((...args: A2) => R2) &
//       ((...args: A3) => R3) &
//       ((...args: A4) => R4) &
//       ((...args: A5) => R5) &
//       ((...args: A6) => R6) &
//       ((...args: A7) => R7) &
//       ((...args: A8) => R8) &
//       ((...args: A9) => R9) &
//       ((...args: A10) => R10) &
//       ((...args: A11) => R11) &
//       ((...args: A12) => R12) &
//       ((...args: A13) => R13) &
//       ((...args: A14) => R14) &
//       ((...args: A15) => R15) &
//       ((...args: A16) => R16)
//   : T extends {
//       (...args: infer A1): infer R1;
//       (...args: infer A2): infer R2;
//       (...args: infer A3): infer R3;
//       (...args: infer A4): infer R4;
//       (...args: infer A5): infer R5;
//       (...args: infer A6): infer R6;
//       (...args: infer A7): infer R7;
//       (...args: infer A8): infer R8;
//       (...args: infer A9): infer R9;
//       (...args: infer A10): infer R10;
//       (...args: infer A11): infer R11;
//       (...args: infer A12): infer R12;
//       (...args: infer A13): infer R13;
//       (...args: infer A14): infer R14;
//       (...args: infer A15): infer R15;
//     }
//   ? ((...args: A1) => R1) &
//       ((...args: A2) => R2) &
//       ((...args: A3) => R3) &
//       ((...args: A4) => R4) &
//       ((...args: A5) => R5) &
//       ((...args: A6) => R6) &
//       ((...args: A7) => R7) &
//       ((...args: A8) => R8) &
//       ((...args: A9) => R9) &
//       ((...args: A10) => R10) &
//       ((...args: A11) => R11) &
//       ((...args: A12) => R12) &
//       ((...args: A13) => R13) &
//       ((...args: A14) => R14) &
//       ((...args: A15) => R15)
//   : T extends {
//       (...args: infer A1): infer R1;
//       (...args: infer A2): infer R2;
//       (...args: infer A3): infer R3;
//       (...args: infer A4): infer R4;
//       (...args: infer A5): infer R5;
//       (...args: infer A6): infer R6;
//       (...args: infer A7): infer R7;
//       (...args: infer A8): infer R8;
//       (...args: infer A9): infer R9;
//       (...args: infer A10): infer R10;
//       (...args: infer A11): infer R11;
//       (...args: infer A12): infer R12;
//       (...args: infer A13): infer R13;
//       (...args: infer A14): infer R14;
//     }
//   ? ((...args: A1) => R1) &
//       ((...args: A2) => R2) &
//       ((...args: A3) => R3) &
//       ((...args: A4) => R4) &
//       ((...args: A5) => R5) &
//       ((...args: A6) => R6) &
//       ((...args: A7) => R7) &
//       ((...args: A8) => R8) &
//       ((...args: A9) => R9) &
//       ((...args: A10) => R10) &
//       ((...args: A11) => R11) &
//       ((...args: A12) => R12) &
//       ((...args: A13) => R13) &
//       ((...args: A14) => R14)
//   : T extends {
//       (...args: infer A1): infer R1;
//       (...args: infer A2): infer R2;
//       (...args: infer A3): infer R3;
//       (...args: infer A4): infer R4;
//       (...args: infer A5): infer R5;
//       (...args: infer A6): infer R6;
//       (...args: infer A7): infer R7;
//       (...args: infer A8): infer R8;
//       (...args: infer A9): infer R9;
//       (...args: infer A10): infer R10;
//       (...args: infer A11): infer R11;
//       (...args: infer A12): infer R12;
//       (...args: infer A13): infer R13;
//     }
//   ? ((...args: A1) => R1) &
//       ((...args: A2) => R2) &
//       ((...args: A3) => R3) &
//       ((...args: A4) => R4) &
//       ((...args: A5) => R5) &
//       ((...args: A6) => R6) &
//       ((...args: A7) => R7) &
//       ((...args: A8) => R8) &
//       ((...args: A9) => R9) &
//       ((...args: A10) => R10) &
//       ((...args: A11) => R11) &
//       ((...args: A12) => R12) &
//       ((...args: A13) => R13)
//   : T extends {
//       (...args: infer A1): infer R1;
//       (...args: infer A2): infer R2;
//       (...args: infer A3): infer R3;
//       (...args: infer A4): infer R4;
//       (...args: infer A5): infer R5;
//       (...args: infer A6): infer R6;
//       (...args: infer A7): infer R7;
//       (...args: infer A8): infer R8;
//       (...args: infer A9): infer R9;
//       (...args: infer A10): infer R10;
//       (...args: infer A11): infer R11;
//       (...args: infer A12): infer R12;
//     }
//   ? ((...args: A1) => R1) &
//       ((...args: A2) => R2) &
//       ((...args: A3) => R3) &
//       ((...args: A4) => R4) &
//       ((...args: A5) => R5) &
//       ((...args: A6) => R6) &
//       ((...args: A7) => R7) &
//       ((...args: A8) => R8) &
//       ((...args: A9) => R9) &
//       ((...args: A10) => R10) &
//       ((...args: A11) => R11) &
//       ((...args: A12) => R12)
//   : T extends {
//       (...args: infer A1): infer R1;
//       (...args: infer A2): infer R2;
//       (...args: infer A3): infer R3;
//       (...args: infer A4): infer R4;
//       (...args: infer A5): infer R5;
//       (...args: infer A6): infer R6;
//       (...args: infer A7): infer R7;
//       (...args: infer A8): infer R8;
//       (...args: infer A9): infer R9;
//       (...args: infer A10): infer R10;
//       (...args: infer A11): infer R11;
//     }
//   ? ((...args: A1) => R1) &
//       ((...args: A2) => R2) &
//       ((...args: A3) => R3) &
//       ((...args: A4) => R4) &
//       ((...args: A5) => R5) &
//       ((...args: A6) => R6) &
//       ((...args: A7) => R7) &
//       ((...args: A8) => R8) &
//       ((...args: A9) => R9) &
//       ((...args: A10) => R10) &
//       ((...args: A11) => R11)
//   : T extends {
//       (...args: infer A1): infer R1;
//       (...args: infer A2): infer R2;
//       (...args: infer A3): infer R3;
//       (...args: infer A4): infer R4;
//       (...args: infer A5): infer R5;
//       (...args: infer A6): infer R6;
//       (...args: infer A7): infer R7;
//       (...args: infer A8): infer R8;
//       (...args: infer A9): infer R9;
//       (...args: infer A10): infer R10;
//     }
//   ? ((...args: A1) => R1) &
//       ((...args: A2) => R2) &
//       ((...args: A3) => R3) &
//       ((...args: A4) => R4) &
//       ((...args: A5) => R5) &
//       ((...args: A6) => R6) &
//       ((...args: A7) => R7) &
//       ((...args: A8) => R8) &
//       ((...args: A9) => R9) &
//       ((...args: A10) => R10)
//   : T extends {
//       (...args: infer A1): infer R1;
//       (...args: infer A2): infer R2;
//       (...args: infer A3): infer R3;
//       (...args: infer A4): infer R4;
//       (...args: infer A5): infer R5;
//       (...args: infer A6): infer R6;
//       (...args: infer A7): infer R7;
//       (...args: infer A8): infer R8;
//       (...args: infer A9): infer R9;
//     }
//   ? ((...args: A1) => R1) &
//       ((...args: A2) => R2) &
//       ((...args: A3) => R3) &
//       ((...args: A4) => R4) &
//       ((...args: A5) => R5) &
//       ((...args: A6) => R6) &
//       ((...args: A7) => R7) &
//       ((...args: A8) => R8) &
//       ((...args: A9) => R9)
//   : T extends {
//       (...args: infer A1): infer R1;
//       (...args: infer A2): infer R2;
//       (...args: infer A3): infer R3;
//       (...args: infer A4): infer R4;
//       (...args: infer A5): infer R5;
//       (...args: infer A6): infer R6;
//       (...args: infer A7): infer R7;
//       (...args: infer A8): infer R8;
//     }
//   ? ((...args: A1) => R1) &
//       ((...args: A2) => R2) &
//       ((...args: A3) => R3) &
//       ((...args: A4) => R4) &
//       ((...args: A5) => R5) &
//       ((...args: A6) => R6) &
//       ((...args: A7) => R7) &
//       ((...args: A8) => R8)
//   : T extends {
//       (...args: infer A1): infer R1;
//       (...args: infer A2): infer R2;
//       (...args: infer A3): infer R3;
//       (...args: infer A4): infer R4;
//       (...args: infer A5): infer R5;
//       (...args: infer A6): infer R6;
//       (...args: infer A7): infer R7;
//     }
//   ? ((...args: A1) => R1) &
//       ((...args: A2) => R2) &
//       ((...args: A3) => R3) &
//       ((...args: A4) => R4) &
//       ((...args: A5) => R5) &
//       ((...args: A6) => R6) &
//       ((...args: A7) => R7)
//   : T extends {
//       (...args: infer A1): infer R1;
//       (...args: infer A2): infer R2;
//       (...args: infer A3): infer R3;
//       (...args: infer A4): infer R4;
//       (...args: infer A5): infer R5;
//       (...args: infer A6): infer R6;
//     }
//   ? ((...args: A1) => R1) &
//       ((...args: A2) => R2) &
//       ((...args: A3) => R3) &
//       ((...args: A4) => R4) &
//       ((...args: A5) => R5) &
//       ((...args: A6) => R6)
//   : T extends {
//       (...args: infer A1): infer R1;
//       (...args: infer A2): infer R2;
//       (...args: infer A3): infer R3;
//       (...args: infer A4): infer R4;
//       (...args: infer A5): infer R5;
//     }
//   ? ((...args: A1) => R1) &
//       ((...args: A2) => R2) &
//       ((...args: A3) => R3) &
//       ((...args: A4) => R4) &
//       ((...args: A5) => R5)
//   : T extends {
//       (...args: infer A1): infer R1;
//       (...args: infer A2): infer R2;
//       (...args: infer A3): infer R3;
//       (...args: infer A4): infer R4;
//     }
//   ? ((...args: A1) => R1) &
//       ((...args: A2) => R2) &
//       ((...args: A3) => R3) &
//       ((...args: A4) => R4)
//   : T extends {
//       (...args: infer A1): infer R1;
//       (...args: infer A2): infer R2;
//       (...args: infer A3): infer R3;
//     }
//   ? ((...args: A1) => R1) & ((...args: A2) => R2) & ((...args: A3) => R3)
//   : T extends {
//       (...args: infer A1): infer R1;
//       (...args: infer A2): infer R2;
//     }
//   ? ((...args: A1) => R1) & ((...args: A2) => R2)
//   : T extends (...args: infer A) => infer R
//   ? (...args: A) => R
//   : never;
