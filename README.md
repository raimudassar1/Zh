# 漢語學習 — Beginner to TOCFL B1

A comprehensive web-based Chinese learning platform designed for learners progressing from absolute beginner to TOCFL Level B1 (Intermediate). This application features a rich set of interactive tools, structured lessons, and extensive data to support character mastery, vocabulary acquisition, and reading comprehension.

## 📊 Project Statistics

- **Total Characters:** 1,443 (TOCFL Novice, A1, A2, and B1)
- **Unique Vocabulary:** 1,649 words (including 100 new Playground lessons)
- **Structured Chapters:** 30 (Novice to A2)
- **Beginner Playground Chapters:** 20 (High-repetition foundation)
- **Total Foundation Lessons:** 100 (60 words per lesson, 10x repetition)
- **Interactive Scenarios:** 7 specialized modules
- **Data Footprint:** ~6MB of JSON-based learning content

## 🚀 Key Learning Features

| Feature | Status | Description |
| :--- | :--- | :--- |
| **Beginner Playground** | ✅ NEW | 100 lessons focused on "baby-style" high-repetition recognition (10x drills). |
| **Character Playground** | ✅ NEW | Decomposition, Formation Lab, and "Build a Character" game. |
| **Voice Practice** | ✅ NEW | Record and play back your own pronunciation for comparison with native TTS. |
| **PWA Support** | ✅ NEW | Installable on mobile/desktop with full offline support via Service Worker. |
| **Dashboard** | ✅ Complete | Overview of progress, streak tracking, and personalized "Targeted Review." |
| **Learning Path** | ✅ Complete | Map-based progression integrating both Playground and TOCFL levels. |
| **Flashcards (SRS)** | ✅ Complete | Spaced-repetition system now integrated with Playground completion. |
| **Character Library** | ✅ Complete | Searchable database of 1,443 characters with stroke animations. |
| **Mock Tests** | ✅ Complete | Reading and Listening simulations for TOCFL preparation. |
| **Writing Board** | ✅ Complete | Guided and freehand character writing practice. |

## 📂 Project Structure

- `index.html`: Main application shell and router.
- `css/main.css`: Comprehensive styling with light/dark mode and animations.
- `js/`: Modularized application logic.
  - `app.js`: Core state management and router.
  - `playground.js`: Logic for the 100 high-repetition foundation lessons.
  - `voice.js`: MediaRecorder wrapper for speaking practice.
  - `sw.js`: Service worker for PWA offline capabilities.
  - `srs.js`: Spaced-repetition algorithm (SM-2).
- `data/`: JSON data sources for characters, vocabulary, and playgrounds.

## 🛠️ Tech Stack

- **Frontend:** Vanilla JavaScript (ES6+), CSS3 (Animations, Variables), HTML5.
- **PWA:** Web App Manifest and Service Workers.
- **Libraries:** [Hanzi Writer](https://chanind.github.io/hanzi-writer/) for stroke animations.
- **Media:** Web Audio API & MediaRecorder API for voice practice.

## ⏭️ Next Features & Improvements

- [ ] **B2/C1 Content Expansion:** Integrate advanced TOCFL levels.
- [ ] **Tone Training Game:** Specialized mini-game for distinguishing the 4 tones.
- [ ] **Handwriting Recognition:** Integrate AI-based stroke order validation.
- [ ] **Cloud Sync:** Allow users to sync progress across multiple devices.
