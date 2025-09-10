#!/usr/bin/env node

import { readdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import crypto from 'crypto';

/**
 * Generate a unique 8-character hex ID
 * @returns {string} 8-character hex string
 */
function generateId() {
  return crypto.randomBytes(4).toString('hex');
}

/**
 * Check if an ID already exists in the events set
 * @param {string} id - ID to check
 * @param {Set<string>} existingIds - Set of existing IDs
 * @returns {boolean} true if ID exists
 */
function idExists(id, existingIds) {
  return existingIds.has(id);
}

/**
 * Generate a unique ID that doesn't conflict with existing ones
 * @param {Set<string>} existingIds - Set of existing IDs
 * @returns {string} Unique 8-character hex string
 */
function generateUniqueId(existingIds) {
  let id;
  let attempts = 0;
  const maxAttempts = 1000; // Prevent infinite loop
  
  do {
    id = generateId();
    attempts++;
    if (attempts > maxAttempts) {
      throw new Error('Failed to generate unique ID after 1000 attempts');
    }
  } while (idExists(id, existingIds));
  
  return id;
}

/**
 * Process all JSON files in the data directory
 */
async function processDataFiles() {
  const dataDir = './data';
  let totalModified = 0;
  let totalProcessed = 0;
  const allIds = new Set();
  
  try {
    // First pass: collect all existing IDs
    console.log('📊 Collecting existing IDs...');
    const files = await readdir(dataDir);
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    
    for (const file of jsonFiles) {
      const filePath = join(dataDir, file);
      const content = await readFile(filePath, 'utf-8');
      
      try {
        const events = JSON.parse(content);
        if (Array.isArray(events)) {
          events.forEach(event => {
            if (event.id && event.id.trim() !== '') {
              allIds.add(event.id);
            }
          });
        }
      } catch (parseError) {
        console.error(`⚠️  Failed to parse ${file}: ${parseError.message}`);
      }
    }
    
    console.log(`✅ Found ${allIds.size} existing IDs\n`);
    
    // Second pass: add missing IDs
    console.log('🔧 Processing files for missing IDs...');
    
    for (const file of jsonFiles) {
      const filePath = join(dataDir, file);
      const content = await readFile(filePath, 'utf-8');
      
      try {
        const events = JSON.parse(content);
        if (!Array.isArray(events)) {
          console.log(`⏭️  Skipping ${file} (not an array)`);
          continue;
        }
        
        let modified = false;
        totalProcessed++;
        
        events.forEach(event => {
          // Check if ID is missing or empty
          if (!event.id || event.id.trim() === '') {
            const newId = generateUniqueId(allIds);
            event.id = newId;
            allIds.add(newId);
            modified = true;
            console.log(`  ➕ Added ID ${newId} to event: ${event.title || 'Untitled'}`);
          }
        });
        
        if (modified) {
          // Write back to file with pretty formatting
          await writeFile(filePath, JSON.stringify(events, null, 2) + '\n');
          totalModified++;
          console.log(`✅ Updated ${file}`);
        } else {
          console.log(`✔️  ${file} - all events have IDs`);
        }
        
      } catch (parseError) {
        console.error(`❌ Failed to process ${file}: ${parseError.message}`);
      }
    }
    
    console.log('\n📈 Summary:');
    console.log(`   Files processed: ${totalProcessed}`);
    console.log(`   Files modified: ${totalModified}`);
    console.log(`   Total unique IDs: ${allIds.size}`);
    
    if (totalModified > 0) {
      console.log('\n✨ Backfill completed successfully!');
    } else {
      console.log('\n✨ No changes needed - all events already have IDs');
    }
    
  } catch (error) {
    console.error('❌ Error processing files:', error.message);
    process.exit(1);
  }
}

// Run the script
console.log('🚀 Starting ID backfill process...\n');
processDataFiles().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
