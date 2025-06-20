import tamilMapping from './transileration.json';

// Function to parse Tamil text into individual characters/clusters
const parseTamilText = (text) => {
  if (!text) return [];
  
  const result = [];
  let i = 0;
  
  // Include both "க்ஷ" and "க்ஷ்" to catch both cases
  const specialClusters = ["க்ஷௌ", "க்ஷோ", "க்ஷொ", "க்ஷை", "க்ஷே", "க்ஷெ", "க்ஷூ", "க்ஷு", "க்ஷீ", "க்ஷி", "க்ஷா", "ஸ்ரீ", "க்ஷ்", "க்ஷ"];
  
  while (i < text.length) {
    try {
      let matched = false;
      
      // Check for special clusters first
      for (const cluster of specialClusters) {
        if (text.slice(i, i + cluster.length) === cluster) {
          result.push(cluster);
          i += cluster.length;
          matched = true;
          break;
        }
      }
      
      if (matched) continue;
      
      // Handle spaces
      if (text[i] === " ") {
        result.push(" ");
        i += 1;
      } 
      // Handle consonant + vowel marker combinations
      else if (
        i + 1 < text.length &&
        /[\u0bbe-\u0bcd\u0bd7]/.test(text[i + 1])
      ) {
        result.push(text[i] + text[i + 1]);
        i += 2;
      } 
      // Handle single characters
      else {
        result.push(text[i]);
        i += 1;
      }
    } catch (error) {
      console.error("Error parsing Tamil text:", error);
      i += 1;
    }
  }
  return result;
};

// Function to convert Tamil text to English transliteration
export const generateTransliteration = (tamilText) => {
  if (!tamilText) return '';

  // Step 1: Parse Tamil text into character/cluster array
  const tamilChars = parseTamilText(tamilText);
  
  const result = tamilChars.map(char => {
    // Handle spaces
    if (char === ' ') {
      return ' ';
    }
    
    // Check if mapping exists and return the first transliteration option
    if (tamilMapping[char] && tamilMapping[char].length > 0) {
      return tamilMapping[char][0];
    }
    
    // If no mapping found, return the original character
    return char;
  });

  // Step 5: Join and return the result
  return result.join('');
};