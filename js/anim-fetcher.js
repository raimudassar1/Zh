// js/anim-fetcher.js
// Direct downloader for app Lottie assets to assets/anim/
const fs = require('fs');
const path = require('path');
const https = require('https');

const ANIM_DIR = path.resolve(__dirname, '../assets/anim');
if (!fs.existsSync(ANIM_DIR)) fs.mkdirSync(ANIM_DIR, { recursive: true });

const UNIQUE_ANIMS = {
  'correct': 'https://assets10.lottiefiles.com/packages/lf20_jbrw3hcz.json',
  'wrong': 'https://assets3.lottiefiles.com/packages/lf20_qpwbiyxf.json',
  'xp_gain': 'https://assets8.lottiefiles.com/packages/lf20_touohxv0.json',
  'level_up': 'https://assets5.lottiefiles.com/packages/lf20_fcfjwiyb.json',
  'session_complete': 'https://assets3.lottiefiles.com/packages/lf20_aZTdD5.json',
  'out_of_hearts': 'https://assets7.lottiefiles.com/packages/lf20_vktpsg4v.json',
  'new_word': 'https://assets6.lottiefiles.com/packages/lf20_yd8fbnml.json',
  'idle': 'https://assets1.lottiefiles.com/packages/lf20_cbrbre30.json',
  'thinking': 'https://assets2.lottiefiles.com/packages/lf20_ystsffqy.json',
  'encouraging': 'https://assets9.lottiefiles.com/packages/lf20_qm8eqzse.json',
  'audio': 'https://assets4.lottiefiles.com/packages/lf20_ikk4jhps.json'
};

const SEMANTIC_MAPPING = {
  // Learning Mode feedback
  'correct_answer': 'correct.json',
  'wrong_answer': 'wrong.json',
  'hint_used': 'thinking.json',
  
  // Streak milestones
  'streak_3': 'encouraging.json',
  'streak_5': 'encouraging.json',
  'streak_10': 'level_up.json',
  'streak_broken': 'out_of_hearts.json',
  
  // XP & level
  'xp_gain': 'xp_gain.json',
  'level_up': 'level_up.json',
  'badge_earned': 'level_up.json',
  
  // Session states
  'session_complete': 'session_complete.json',
  'session_start': 'xp_gain.json',
  'out_of_hearts': 'out_of_hearts.json',
  'perfect_session': 'session_complete.json',
  
  // Question types
  'new_word': 'new_word.json',
  'listening_audio': 'audio.json',
  'speaking_mic': 'audio.json', // Soundwave fallback
  'tile_assembly': 'new_word.json',
  
  // Mascot states
  'mascot_idle': 'idle.json',
  'mascot_thinking': 'thinking.json',
  'mascot_happy': 'encouraging.json',
  'mascot_sad': 'out_of_hearts.json',
  'mascot_encouraging': 'encouraging.json',
  'mascot_sleeping': 'idle.json',
  
  // Categories
  'category_greetings': 'idle.json',
  'category_food': 'encouraging.json',
  'category_family': 'encouraging.json',
  'category_time': 'xp_gain.json',
  'category_nature': 'idle.json',
  'category_work': 'thinking.json',
  'category_travel': 'xp_gain.json',
  'category_emotions': 'encouraging.json',
  'category_numbers': 'xp_gain.json',
  'category_colors': 'level_up.json',
  
  // App wide UI
  'app_loading': 'audio.json',
  'app_error': 'wrong.json',
  'app_empty_state': 'thinking.json',
  'app_search': 'new_word.json',
  'app_settings': 'thinking.json',
  'app_success': 'correct.json',
  'app_notification': 'new_word.json',
  
  // Sections
  'section_flashcards': 'new_word.json',
  'section_quiz': 'thinking.json',
  'section_progress': 'level_up.json',
  'section_dictionary': 'new_word.json',
  'section_practice': 'encouraging.json',
  
  // Achievements
  'achievement_first': 'new_word.json',
  'achievement_streak': 'encouraging.json',
  'achievement_speed': 'encouraging.json',
  'achievement_master': 'level_up.json'
};

async function downloadAnim(url, filename) {
  const filepath = path.join(ANIM_DIR, filename);
  if (fs.existsSync(filepath)) {
    // Delete first to force clean fetch
    fs.unlinkSync(filepath);
  }
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    function getUrl(targetUrl) {
      const options = {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*'
        }
      };
      https.get(targetUrl, options, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          getUrl(res.headers.location);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP status ${res.statusCode} for ${targetUrl}`));
          return;
        }
        res.pipe(file);
        file.on('finish', () => { file.close(); resolve(filepath); });
      }).on('error', (err) => {
        fs.unlink(filepath, () => {});
        reject(err);
      });
    }
    getUrl(url);
  });
}

async function run() {
  console.log('Starting Clean Lottie download...');
  const keys = Object.keys(UNIQUE_ANIMS);
  for (const key of keys) {
    const filename = `${key}.json`;
    console.log(`Downloading ${key} -> ${filename}...`);
    try {
      await downloadAnim(UNIQUE_ANIMS[key], filename);
      console.log(`  Saved.`);
    } catch (e) {
      console.error(`  Error downloading ${key}:`, e.message);
    }
  }
  
  // Build manifest
  const manifest = {};
  Object.keys(SEMANTIC_MAPPING).forEach(key => {
    manifest[key] = {
      file: `assets/anim/${SEMANTIC_MAPPING[key]}`
    };
  });
  
  const manifestPath = path.join(ANIM_DIR, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log('Manifest written successfully.');
}

run().catch(console.error);
