
import { create, all } from 'mathjs';

const math = create(all);

export function checkNumericalAnswer(
  studentInput: string, 
  correctValue: number, 
  correctUnit: string, // e.g., 'N', 'm/s', 'kg'
  tolerance: number
): { isCorrect: boolean; feedback: string } {
  
  try {
    // 1. Clean up student input (remove extra spaces, lower case 'n' to 'N' if needed logic specific)
    // mathjs handles most standard units (km, cm, kg, N, J, W, etc.) efficiently.
    const cleanInput = studentInput.trim();

    // 2. Parse the Student's Input (e.g., "1 kN")
    const studentUnit = math.unit(cleanInput);

    // 3. Convert Student's Input to the Teacher's Base Unit (e.g., "kN" -> "N")
    const convertedValue = studentUnit.toNumber(correctUnit);

    // 4. Check Tolerance
    // Absolute difference check
    const difference = Math.abs(convertedValue - correctValue);
    const isWithinTolerance = difference <= tolerance;

    if (isWithinTolerance) {
      return { isCorrect: true, feedback: 'Correct!' };
    } else {
      return { 
        isCorrect: false, 
        feedback: `Incorrect. Expected ${correctValue} ${correctUnit}. You submitted equivalent of ${convertedValue} ${correctUnit}.` 
      };
    }

  } catch (error) {
    // This catches invalid units (e.g., student types "1000 potatoes")
    return { isCorrect: false, feedback: 'Invalid unit format. Please check your units.' };
  }
}
