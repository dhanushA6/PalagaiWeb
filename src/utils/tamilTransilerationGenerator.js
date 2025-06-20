// // utils/tamilTransliteration.js
// import transliterationMap from './transliteration.json';

// const parseTamilText = (text) => {
//   if (!text) return [];
  
//   const result = [];
//   let i = 0;
  
//   // Include both "க்ஷ" and "க்ஷ்" to catch both cases
//   const specialClusters = [
//     "க்‌ஷௌ", "க்‌ஷோ", "க்‌ஷொ", "க்‌ஷை", "க்‌ஷே", "க்‌ஷெ", 
//     "க்‌ஷூ", "க்‌ஷு", "க்‌ஷீ", "க்‌ஷி", "க்‌ஷா", "க்‌ஷ்", "க்‌ஷ",
//     "க்ஷௌ", "க்ஷோ", "க்ஷொ", "க்ஷை", "க்ஷே", "க்ஷெ", 
//     "க்ஷூ", "க்ஷு", "க்ஷீ", "க்ஷி", "க்ஷா", "க்ஷ்", "க்ஷ",
//     "ஸ்ரீ", "ஃபௌ", "ஃபோ", "ஃபொ", "ஃபை", "ஃபே", "ஃபெ", 
//     "ஃபூ", "ஃபு", "ஃபீ", "ஃபி", "ஃபா", "ஃப்", "ஃப"
//   ];
  
//   while (i < text.length) {
//     try {
//       let matched = false;
      
//       // Check for special clusters first (longest match first)
//       for (const cluster of specialClusters) {
//         if (text.slice(i, i + cluster.length) === cluster) {
//           result.push(cluster);
//           i += cluster.length;
//           matched = true;
//           break;
//         }
//       }
      
//       if (matched) continue;
      
//       // Handle spaces
//       if (text[i] === " ") {
//         result.push(" ");
//         i += 1;
//       } 
//       // Handle compound characters (base + vowel marks)
//       else if (
//         i + 1 < text.length &&
//         /[\u0bbe-\u0bcd\u0bd7]/.test(text[i + 1])
//       ) {
//         result.push(text[i] + text[i + 1]);
//         i += 2;
//       } 
//       // Handle single characters
//       else {
//         result.push(text[i]);
//         i += 1;
//       }
//     } catch (error) {
//       console.error("Error parsing Tamil text:", error);
//       i += 1;
//     }
//   }
  
//   return result;
// };

// const transliterateTamilToEnglish = (tamilText) => {
//   if (!tamilText || typeof tamilText !== 'string') {
//     return '';
//   }
  
//   try {
//     // Parse the Tamil text into individual characters/clusters
//     const tamilChars = parseTamilText(tamilText);
    
//     // Transliterate each character
//     const transliteratedChars = tamilChars.map(char => {
//       // Handle spaces and punctuation
//       if (char === ' ' || /[^\u0B80-\u0BFF]/.test(char)) {
//         return char;
//       }
      
//       // Look up the character in the transliteration map
//       const mapping = transliterationMap[char];
      
//       if (mapping && Array.isArray(mapping) && mapping.length > 0) {
//         // Return the first transliteration option (index 0)
//         return mapping[0];
//       }
      
//       // If no mapping found, return the original character
//       console.warn(`No transliteration found for character: ${char}`);
//       return char;
//     });
    
//     // Join all transliterated characters
//     return transliteratedChars.join('');
    
//   } catch (error) {
//     console.error('Error in transliteration:', error);
//     return tamilText; // Return original text if error occurs
//   }
// };