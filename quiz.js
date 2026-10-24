/* The Gut-Emotion quiz, shared by quiz.html and gut-quiz.html.
   Each page has its own intro and footer, then <div id="quiz-app"></div> followed
   straight away by this script, which fills in the questions, the email gate and
   the result. A page can set before this script:
     window.QUIZ_PAGE          - added as `page` to the quiz events (gut-quiz.html only)
     window.QUIZ_AW_CONVERSION - Google Ads send_to, fired once on a confirmed email signup */
(function () {
  var PAGE = window.QUIZ_PAGE || '';
  // The Google Ads landing page: no links away from the quiz, and the ad click
  // IDs and UTMs ride along to the $9 checkout.
  var AD_PAGE = PAGE === 'gut-quiz';

  // Turn on once the $9 credit against the 30-Day Program is live.
  const SHOW_CREDIT_LINE = false;

  // Straight into the Zylvie cart for the Map (cart ID 78pjRb03), skipping the product page.
  const OFFER_URL = 'https://zylvie.com/michaelhetherington/cart/add/78pjRb03?disable_backlinks&empty_cart&utm_source=digestion_quiz&utm_medium=quiz_result&utm_campaign=';

  // Show the encouragement screen before this question (index 3 is question 4).
  const ENCOURAGE_BEFORE = 3;
  // How long the "matching your answers" screen stays up before the email gate.
  const MATCHING_MS = 2500;

  /* ---------- Ad click IDs and UTMs (gut-quiz.html only) ---------- */

  var AD_KEY = 'mh_quiz_ad_params';
  if (AD_PAGE) {
    (function () {
      var q = new URLSearchParams(location.search);
      var found = {};
      q.forEach(function (v, k) {
        if (v && (k === 'gclid' || k === 'gbraid' || k === 'wbraid' || /^utm_[a-z0-9_]+$/.test(k))) {
          found[k] = v.slice(0, 200);
        }
      });
      // A new ad click replaces the old set, so the source is never a mix of two visits.
      if (Object.keys(found).length) {
        try { sessionStorage.setItem(AD_KEY, JSON.stringify(found)); } catch (e) {}
      }
    })();
  }

  function adParams() {
    try { return JSON.parse(sessionStorage.getItem(AD_KEY) || '{}') || {}; } catch (e) { return {}; }
  }

  // The checkout link for a result type. On the ad page the ad's own values
  // replace the quiz UTMs, so Zylvie records the ad as the source.
  function offerUrl(key) {
    var url = OFFER_URL + key;
    if (!AD_PAGE) return url;
    var ad = adParams();
    Object.keys(ad).forEach(function (k) {
      if (!/^(gclid|gbraid|wbraid|utm_[a-z0-9_]+)$/.test(k)) return;
      var pair = k + '=' + encodeURIComponent(ad[k]);
      var re = new RegExp('([?&])' + k + '=[^&]*');
      url = re.test(url) ? url.replace(re, '$1' + pair) : url + '&' + pair;
    });
    return url;
  }

  /* ---------- Markup ---------- */

  var CHECK = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4E6B4A" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  var LOCK = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';
  var TICK_CIRCLE = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M7.5 12.5l3 3 6-6.5"/></svg>';

  // Line icons for question 1, drawn in sage at 24px.
  var ICONS = {
    bloat: '<path d="M12 2.5a7.5 7.5 0 0 1 7.5 7.5c0 4.4-3.4 7.5-7.5 7.5S4.5 14.4 4.5 10A7.5 7.5 0 0 1 12 2.5z"/><path d="M10.8 17.5l1.2 1.4 1.2-1.4"/><path d="M12 18.9c0 1.4-1.4 1.4-1.4 2.6"/>',
    flare: '<path d="M2 12h3l2.5-6 4 13 3.5-10 2 3h5"/>',
    knot: '<path d="M2 15h4c3 0 4.5-2 5.5-4.5S14 5 16.5 5 20 7 20 9s-1.8 3.5-4 3.5c-3 0-4.5-2.5-5.5-4.5"/><path d="M13 15.5c1 1.5 2.5 2.5 4.5 2.5H22"/><path d="M9.6 8.2C8.8 6.6 8 5 6.5 5"/>',
    swirl: '<path d="M12 12a1.5 1.5 0 0 1 3 0a3 3 0 0 1 -6 0a4.5 4.5 0 0 1 9 0a6 6 0 0 1 -12 0"/>'
  };
  function icon(name) {
    return '<svg class="option-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICONS[name] + '</svg>';
  }

  var TEMPLATE = `
    <!-- QUESTIONS -->
    <div id="quiz-questions">
      <div class="quiz-top">
        <div class="quiz-top-row">
          <button class="back-btn is-hidden" id="back-btn" type="button" aria-label="Previous question">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <span class="quiz-count" id="progress-label">Question 1 of 6</span>
          <span class="quiz-time" id="quiz-time">~54s</span>
        </div>
        <div class="progress-track"><div class="progress-fill" id="progress-fill"></div></div>
      </div>

      <div class="question" id="question-card">
        <h2 class="question-text" id="question-text"></h2>
        <div class="options-list" id="options-list"></div>
      </div>

      <!-- ENCOURAGEMENT: after question 3. Not an answer, and Back skips over it. -->
      <div class="encourage" id="encourage" hidden>
        <svg class="encourage-icon" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2z"/></svg>
        <h2 class="encourage-heading">You're not imagining it.</h2>
        <p class="encourage-text">Many women notice their gut reacts to stress before their mind does. 3 more questions.</p>
        <button class="buy-btn encourage-btn" id="encourage-btn" type="button">Keep going</button>
      </div>

      <p class="private-note">
        ${LOCK}
        Your answers stay private
      </p>
    </div>

    <!-- MATCHING: a short pause after the last question, then the email gate -->
    <div class="screen" id="matching" aria-live="polite">
      <div class="quiz-top">
        <div class="progress-track"><div class="progress-fill" id="matching-fill"></div></div>
      </div>
      <div class="matching">
        <span class="matching-spinner" aria-hidden="true"></span>
        <h2 class="matching-heading">Matching your answers to your Gut-Emotion Type...</h2>
        <ul class="matching-list" id="matching-list">
          <li>${TICK_CIRCLE}Your main symptom</li>
          <li>${TICK_CIRCLE}How stress shows up for you</li>
          <li>${TICK_CIRCLE}What your gut is holding</li>
        </ul>
      </div>
    </div>

    <!-- EMAIL GATE: shown after the matching screen, with a teaser of the result -->
    <div class="screen" id="email-gate">
      <div class="quiz-top">
        <div class="quiz-top-row">
          <span class="quiz-done">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>
            Quiz complete
          </span>
        </div>
        <div class="progress-track"><div class="progress-fill is-done"></div></div>
      </div>

      <div class="teaser">
        <span class="eyebrow">Your Gut-Emotion Type</span>
        <p class="teaser-name" id="teaser-name"></p>
        <p class="teaser-organ" id="teaser-organ"></p>
        <div class="teaser-bars" aria-hidden="true"><span></span><span></span><span></span></div>
        <span class="teaser-lock">
          ${LOCK}
          Your full reading and tapping tip
        </span>
      </div>

      <h2 class="gate-heading">Where should I send your full result?</h2>
      <p class="gate-text">Your Gut-Emotion Type, why it shows up in your gut, plus a free 5-minute tapping session to calm your belly.</p>

      <div class="mh-cap">
        <form method="post" action="https://sendfox.com/form/m44x5n/3ekowl" class="sendfox-form" id="3ekowl" data-async="true" data-recaptcha="true" data-quiz="digestion" data-branch="mixed">
          <p><label for="sendfox_form_name">First name</label><input type="text" id="sendfox_form_name" placeholder="First name" name="first_name" autocomplete="given-name" required /></p>
          <p><label for="sendfox_form_email">Email</label><input type="email" id="sendfox_form_email" placeholder="Email" name="email" autocomplete="email" required /></p>
          <!-- no botz please -->
          <div style="position: absolute; left: -5000px;" aria-hidden="true"><input type="text" name="a_password" tabindex="-1" value="" autocomplete="off" /></div>
          <p><button type="submit" class="mh-cap__btn">Show My Full Result</button></p>
        </form>
        <p class="mh-cap__note">No spam. Unsubscribe in one click.</p>
        <p class="mh-cap__note">Protected by reCAPTCHA. Google <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">Privacy</a> and <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer">Terms</a> apply.</p>
      </div>
    </div>

    <!-- RESULT: one template, filled in from \`results\` below -->
    <div class="screen" id="result">
      <!-- 1. Inbox notice. No "open email" button, so they stay for the offer. -->
      <div class="res-head inbox">
        <svg class="inbox-tick" width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="#4E6B4A"/><path d="M7 12.5l3.2 3.2L17 9" fill="none" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
        <h2 class="inbox-heading" id="result-intro">Your full results are on their way to your inbox</h2>
        <p class="inbox-text">It will take 1 minute to arrive.</p>
        <p class="inbox-text"><strong>I've also sent you a free 5-minute gut-calming EFT tapping session you can practise right now.</strong></p>
        <p class="inbox-note">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>
          <span>Can't see it?<br />Check your Promotions or spam folder and move it to your Primary inbox.</span>
        </p>
      </div>

      <!-- 1b. Their type, up top. The full reading sits below the offer. -->
      <div class="type-card">
        <p class="type-label">Your Gut-Emotion Type</p>
        <h2 class="type-name" id="type-name-top"></h2>
        <p class="type-line" id="type-organ-top"></p>
        <p class="type-line" id="type-emotion-top"></p>
        <p class="type-below">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14M6 13l6 6 6-6"/></svg>
          The full reading is below
        </p>
      </div>

      <!-- Welcome video (muted autoplay). data-src becomes src in showResult(),
           so it never plays while the result is still hidden. -->
      <div class="welcome-video" style="max-width:720px;margin:24px auto 32px;padding:0 16px;">
        <p style="text-align:center;font-weight:600;margin:0 0 12px;">Watch this first (90 seconds)</p>
        <div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:12px;box-shadow:0 4px 18px rgba(0,0,0,0.12);">
          <iframe
            data-src="https://www.youtube-nocookie.com/embed/u3T7a4jGspo?autoplay=1&mute=1&playsinline=1&rel=0"
            title="Welcome from Michael"
            style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;"
            allow="autoplay; accelerometer; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen></iframe>
        </div>
        <p style="text-align:center;font-size:14px;opacity:0.75;margin:10px 0 0;">Playing on mute. Tap the video for sound.</p>
      </div>

      <!-- 2. The $9 offer -->
      <div class="offer" id="offer-card">
        <span class="offer-label">Before you go · Only on this page</span>
        <h3 class="offer-heading">Find the emotion behind your symptom. Know exactly what to tap.</h3>
        <div class="offer-row">
          <a class="offer-img" id="offer-img-link" href="https://zylvie.com/michaelhetherington/p/gut-emotion-map">
            <picture>
              <source type="image/webp" srcset="assets/gut-emotion-map-300.webp 300w, assets/gut-emotion-map-600.webp 600w" sizes="(min-width: 640px) 280px, 170px" />
              <img src="assets/gut-emotion-map.png" width="280" height="280" alt="The Gut-Emotion Map: 15 symptoms, 15 tapping scripts" decoding="async" />
            </picture>
          </a>
          <div>
            <p class="offer-meta">44-page PDF · 15 gut symptom patterns · 15 tapping scripts</p>
            <p class="offer-price"><span class="price-now">$9</span> <span class="price-note">one payment</span></p>
          </div>
        </div>
        <a class="buy-btn" id="offer-btn" href="https://zylvie.com/michaelhetherington/p/gut-emotion-map">Get the Gut-Emotion Map · $9</a>
        <p class="secure-note">
          ${LOCK}
          Secure checkout · Card or PayPal
        </p>
        <p class="offer-ticks">
          <span>${CHECK}Instant download</span>
          <span>${CHECK}30-day money back</span>
        </p>
        <p class="credit-box" id="credit-line" hidden>Join the 30-Day Program within 14 days and your $9 comes off the price.</p>
        <div class="inside">
          <h3>What's inside</h3>
          <p id="offer-detail"></p>
          <ul>
            <li>${CHECK}<span>The one-page Quick Finder: symptom, organ, emotion</span></li>
            <li>${CHECK}<span>15 word-for-word, 3-round tapping scripts</span></li>
            <li>${CHECK}<span>Your Gut-Emotion Tracker</span></li>
            <li>${CHECK}<span><strong>Bonus:</strong> the 10-Minute Bloat Relief Kit</span></li>
          </ul>
        </div>
      </div>

      <!-- Testimonial: hidden until a real one is added. Fill in both lines and remove \`hidden\`. -->
      <figure class="res-quote" id="result-quote" hidden>
        <blockquote></blockquote>
        <figcaption></figcaption>
      </figure>

      <div class="bottom-buy">
        <a class="buy-btn" id="offer-btn-bottom" href="https://zylvie.com/michaelhetherington/p/gut-emotion-map">Yes, I want the Map · $9</a>
      </div>

      <!-- 3. Skip link for people who only want their results -->
      <p class="skip-line">Just here for your results? <a href="#full-results">Read them below</a>. A copy is in your inbox too.</p>

      <!-- 4. Full results -->
      <section class="full-results" id="full-results" aria-labelledby="full-results-heading">
        <!-- Dark card so the type and reading stand out as their own section. -->
        <div class="reading-card">
          <h2 class="full-heading" id="full-results-heading">Your full Gut-Emotion reading</h2>
          <p class="full-type">Your Gut-Emotion Type <strong id="result-name"></strong></p>
          <div class="pills"><span class="pill" id="pill-organ"></span><span class="pill" id="pill-emotion"></span></div>

          <div class="reading" id="result-reading"></div>

          <details class="tip">
            <summary>Your 30-second tapping tip
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>
            </summary>
            <div class="tip-body">
              <div id="result-tip"></div>
            </div>
          </details>
        </div>

      ${AD_PAGE ? '' : `<div class="deeper">
        <a class="buy-btn" id="program-link" href="https://healyourdigestioneft.com/">Want to go deeper? Check out the full program</a>
      </div>`}

      <p class="disclaimer">For stress-related digestive discomfort. Not medical advice. If your symptoms are severe, new or getting worse, please see your doctor first. EFT works best alongside good medical care.</p>
      </section>
    </div>
  `;

  document.getElementById('quiz-app').innerHTML = TEMPLATE;

  /* ---------- Questions and results ---------- */

  // W = worrier, P = pressure, H = holder, M = mixed. The last question isn't scored.
  const questions = [
    {
      text: "Which gut symptom bothers you most?",
      options: [
        { label: "Bloating, heaviness or tiredness after eating", type: 'W', icon: 'bloat' },
        { label: "Cramping, reflux or food reactions that flare up", type: 'P', icon: 'flare' },
        { label: "Constipation, or feeling like things are stuck", type: 'H', icon: 'knot' },
        { label: "A mix. It changes from day to day", type: 'M', icon: 'swirl' }
      ]
    },
    {
      text: "When do your symptoms get worse?",
      options: [
        { label: "When I'm worrying or my mind won't switch off", type: 'W' },
        { label: "When I'm stressed, rushed or frustrated", type: 'P' },
        { label: "When I'm sad, lonely or holding things in", type: 'H' },
        { label: "Honestly, all of the above", type: 'M' }
      ]
    },
    {
      text: "What does your mind feel like on a hard day?",
      options: [
        { label: "Overthinking. Going over the same things again and again", type: 'W' },
        { label: "Tense and irritable, even if I don't show it", type: 'P' },
        { label: "Heavy, flat and quietly sad", type: 'H' },
        { label: "Busy and anxious. A bit of everything", type: 'M' }
      ]
    },
    {
      text: "How do you feel after a meal?",
      options: [
        { label: "Sleepy and foggy. I want to lie down", type: 'W' },
        { label: "Uncomfortable and tight in my stomach", type: 'P' },
        { label: "Heavy and sluggish, like nothing is moving", type: 'H' },
        { label: "It depends on the day", type: 'M' }
      ]
    },
    {
      text: "Which of these sounds most like you?",
      options: [
        { label: "I'm the one who looks after everyone else", type: 'W' },
        { label: "I push through and keep going, even when I'm over it", type: 'P' },
        { label: "I find it hard to let go of things, people or the past", type: 'H' },
        { label: "Maybe all three", type: 'M' }
      ]
    },
    {
      text: "How long has your gut been like this?",
      options: [
        { label: "Less than a year", duration: 'lt1' },
        { label: "1 to 3 years", duration: '1to3' },
        { label: "3 to 5 years", duration: '3to5' },
        { label: "More than 5 years", duration: 'gt5' }
      ]
    }
  ];

  const durationLines = {
    lt1: `This has been building for less than a year, which is a really good time to catch it.`,
    '1to3': `You've been carrying this for a few years now.`,
    '3to5': `You've been living with this for 3 to 5 years.`,
    gt5: `You've been living with this for more than 5 years.`
  };

  // reading[2] gets the duration line put in front of it. **text** shows in bold.
  const results = {
    worrier: {
      name: `The Worrier`,
      organ: `Organ system: Spleen and Stomach · Emotion: worry and overthinking`,
      reading: [
        `In Chinese medicine, the Spleen and Stomach have two jobs. **They digest your food, and they digest your thoughts.**`,
        `When your mind is always running, planning, replaying and looking after everyone else, that energy gets pulled away from digestion. **That's where the bloating, the heaviness and the after-meal tiredness come from.**`,
        `**That's not a broken gut.** It's a gut that has been doing two jobs for a long time with no break.`
      ],
      tip: [
        `Tap on the side of your hand and say three times: "Even though my mind won't switch off and my stomach is carrying it, I'm okay."`,
        `Then tap through the points saying: "All this worry, sitting in my belly."`,
        `Finish with one hand on your stomach and three slow breaths out.`
      ],
      offer: `Inside you'll find the Worrier symptoms like bloating, heaviness and tiredness after meals, each with its own word-for-word tapping script.`,
    },
    pressure: {
      name: `The Pressure Cooker`,
      organ: `Organ system: Liver · Emotion: frustration and held-in stress`,
      reading: [
        `In Chinese medicine, the Liver keeps everything in your body moving smoothly. **Emotions included.**`,
        `When you push through, swallow your frustration and keep going, the Liver gets tight. **That tension spills straight into your gut.** Cramping. Reflux. Flare-ups that seem to come from nowhere. Reacting to foods that used to be fine.`,
        `**Your gut isn't overreacting.** It's reacting to pressure that has had nowhere else to go.`
      ],
      tip: [
        `Tap on the side of your hand and say three times: "Even though I'm holding so much in and my gut is paying for it, I'm okay."`,
        `Then tap through the points saying: "All this pressure. All this tension in my gut."`,
        `Finish with a long sigh out through your mouth. In Chinese medicine, a sigh is the Liver letting off steam.`
      ],
      offer: `Inside you'll find the Pressure Cooker symptoms like cramping, reflux and food reactions, each with its own word-for-word tapping script.`,
    },
    holder: {
      name: `The Holder`,
      organ: `Organ system: Lung and Large Intestine · Emotion: grief and holding on`,
      reading: [
        `In Chinese medicine, the Lung and Large Intestine are partners. **The Lung takes in what's new. The Large Intestine lets go of what's finished.**`,
        `**When grief, loss or old hurt doesn't get fully felt, the body starts holding on.** Physically and emotionally. That's where the constipation, the heaviness and the stuck feeling come from.`,
        `**Your body isn't failing to let go.** It's been holding on because something hasn't felt safe to release yet.`
      ],
      tip: [
        `Tap on the side of your hand and say three times: "Even though part of me is still holding on, I'm open to letting a little bit go."`,
        `Then tap through the points saying: "What I'm still holding. Letting a little go."`,
        `Finish with a slow breath in through your nose and a longer breath out, letting your belly soften.`
      ],
      offer: `Inside you'll find the Holder symptoms like constipation, heaviness and feeling stuck, each with its own word-for-word tapping script.`,
    },
    mixed: {
      name: `The Overloaded Gut`,
      organ: `Organ system: the whole digestive system · Emotion: a backlog of everything`,
      reading: [
        `Your answers point to more than one pattern. **Worry, pressure and holding on are all showing up in your gut.** That's more common than you'd think.`,
        `**It usually means there's a backlog.** Years of stress and emotion that never got fully processed, stacked up in the body. Your gut is simply where it shows.`,
        `The good news: **you don't have to clear it all at once.** You start with whatever is loudest today.`
      ],
      tip: [
        `Tap on the side of your hand and say three times: "Even though there's so much going on in my gut and I don't know where to start, I'm okay."`,
        `Then tap through the points saying: "All of it. Everything my gut is carrying."`,
        `Finish by asking yourself: "What's loudest right now?" That's where you start next time.`
      ],
      offer: `Inside you'll find all 15 gut symptom patterns, so you can work on whichever one is loudest for you today.`,
    }
  };

  /* ---------- Quiz ---------- */

  let currentQuestion = 0;
  // The chosen option for each answered question, in order. Back removes the last one.
  const answers = [];
  let answered = false;
  let quizStarted = false;
  let startSource = 'quiz_page';
  // The encouragement screen shows once. onEncourage is true while it's up.
  let encouraged = false;
  let onEncourage = false;

  const questionCard = document.getElementById('question-card');
  const questionText = document.getElementById('question-text');
  const optionsList = document.getElementById('options-list');
  const encourage = document.getElementById('encourage');
  const progressLabel = document.getElementById('progress-label');
  const progressFill = document.getElementById('progress-fill');
  const quizTime = document.getElementById('quiz-time');
  const backBtn = document.getElementById('back-btn');
  const quizQuestions = document.getElementById('quiz-questions');
  const matching = document.getElementById('matching');
  const resultCard = document.getElementById('result');
  const emailGate = document.getElementById('email-gate');
  // All go to the Map checkout; click_target tells them apart in GA.
  const offerLinks = [
    [document.getElementById('offer-btn'), 'button'],
    [document.getElementById('offer-img-link'), 'image'],
    [document.getElementById('offer-btn-bottom'), 'button_bottom']
  ];
  const programLink = document.getElementById('program-link');

  // Counts per type, worked out from the answers so Back can undo one.
  function tally() {
    const counts = { W: 0, P: 0, H: 0, M: 0 };
    answers.forEach(a => { if (a && a.type) counts[a.type]++; });
    return counts;
  }

  function durationKey() {
    const last = answers[questions.length - 1];
    return (last && last.duration) || '';
  }

  function setCompact(on) {
    document.body.classList.toggle('compact', on);
  }

  function renderQuestion(index) {
    const q = questions[index];
    onEncourage = false;
    encourage.hidden = true;
    encourage.classList.remove('fade-out');
    questionCard.hidden = false;
    questionText.textContent = q.text;
    optionsList.innerHTML = '';
    answered = false;

    q.options.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'option-btn';
      btn.type = 'button';
      btn.innerHTML = `
        ${opt.icon ? icon(opt.icon) : ''}
        <span class="option-label">${opt.label}</span>
        <svg class="option-check" width="20" height="20" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <circle cx="9" cy="9" r="8" fill="#A9601F"/>
          <path d="M5 9L7.5 11.5L13 6.5" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      `;
      btn.addEventListener('click', () => selectOption(btn, opt));
      optionsList.appendChild(btn);
    });

    updateProgress(index);
  }

  // Sits between questions, so currentQuestion already points at the next one.
  function showEncourage() {
    encouraged = true;
    onEncourage = true;
    answered = false;
    questionCard.hidden = true;
    encourage.hidden = false;
    setProgress((progressFor(currentQuestion - 1) + progressFor(currentQuestion)) / 2);
    progressLabel.textContent = 'Halfway there';
    quizTime.textContent = `~${(questions.length - currentQuestion) * 9}s`;
    backBtn.classList.remove('is-hidden');
  }

  function selectOption(btn, opt) {
    if (answered) return;
    answered = true;

    // Mark selected
    document.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');

    answers.length = currentQuestion;
    answers.push(opt);

    if (!quizStarted) {
      quizStarted = true;
      track('quiz_start', withPage({ source: startSource }));
    }
    if (currentQuestion === questions.length - 1) {
      track('quiz_complete', withPage({ result: resultKey(), duration: durationKey() }));
    }

    setTimeout(() => {
      questionCard.classList.add('fade-out');
      setTimeout(() => {
        setCompact(true);
        questionCard.classList.remove('fade-out');
        if (currentQuestion < questions.length - 1) {
          currentQuestion++;
          if (currentQuestion === ENCOURAGE_BEFORE && !encouraged) showEncourage();
          else renderQuestion(currentQuestion);
          window.scrollTo(0, 0);
        } else {
          // Last question: a short matching screen, then ask for an email before the result
          quizQuestions.style.display = 'none';
          showMatching();
        }
      }, 250);
    }, 300);
  }

  function continueFromEncourage() {
    if (!onEncourage) return;
    encourage.classList.add('fade-out');
    setTimeout(() => {
      renderQuestion(currentQuestion);
      window.scrollTo(0, 0);
    }, 250);
  }

  // From the encouragement screen, or from the question after it, Back goes to question 3.
  function goBack() {
    if (currentQuestion === 0 || answered) return;
    currentQuestion--;
    answers.length = currentQuestion;
    setCompact(true);
    renderQuestion(currentQuestion);
  }

  // 20% on question 1, rising evenly to 100% on the email screen.
  function progressFor(index) {
    return 20 + (index / questions.length) * 80;
  }

  function setProgress(pct) {
    progressFill.style.width = `${pct}%`;
  }

  function updateProgress(index) {
    const qNum = index + 1;
    const total = questions.length;
    progressLabel.textContent = `Question ${qNum} of ${total}`;
    setProgress(progressFor(index));
    quizTime.textContent = `~${(total - index) * 9}s`;
    backBtn.classList.toggle('is-hidden', index === 0);
  }

  // 3+ mixed answers, or a tie between the top two types, means mixed.
  function resultKey() {
    const counts = tally();
    if (counts.M >= 3) return 'mixed';
    const ranked = [['worrier', counts.W], ['pressure', counts.P], ['holder', counts.H]]
      .sort((a, b) => b[1] - a[1]);
    if (ranked[0][1] === ranked[1][1]) return 'mixed';
    return ranked[0][0];
  }

  // Tags an event with the page it came from, so ad traffic reports separately.
  function withPage(params) {
    if (PAGE) params.page = PAGE;
    return params;
  }

  function track(name, params) {
    try { if (typeof gtag === 'function') gtag('event', name, params || {}); } catch (e) {}
  }

  function fbTrack(name) {
    try { if (typeof fbq === 'function') fbq('track', name); } catch (e) {}
  }

  function fadeIn(card) {
    card.classList.add('visible');
    // Trigger reflow before fade-in
    void card.offsetWidth;
    card.classList.add('fade-in');
  }

  // Three lines tick in one by one, then the email gate opens by itself.
  function showMatching() {
    // Start loading SendFox now, so the form is ready when the gate appears.
    if (window.mhLoadSendFox) window.mhLoadSendFox();
    const fill = document.getElementById('matching-fill');
    const lines = document.querySelectorAll('#matching-list li');
    fill.style.width = `${progressFor(questions.length - 1)}%`;
    fadeIn(matching);
    window.scrollTo(0, 0);
    void fill.offsetWidth;
    fill.style.width = '100%';
    lines.forEach((li, i) => setTimeout(() => li.classList.add('is-on'), 400 + i * 700));
    setTimeout(showEmailGate, MATCHING_MS);
  }

  function showEmailGate() {
    const key = resultKey();
    const form = document.getElementById('3ekowl');
    if (form) form.setAttribute('data-branch', key);
    if (window.mhLoadSendFox) window.mhLoadSendFox();
    document.getElementById('teaser-name').textContent = results[key].name;
    document.getElementById('teaser-organ').textContent = results[key].organ;
    matching.classList.remove('visible', 'fade-in');
    fadeIn(emailGate);
    window.scrollTo(0, 0);
  }

  // Builds paragraphs from plain strings, turning **text** into <strong>.
  function paragraphs(texts) {
    return texts.map(t => {
      const p = document.createElement('p');
      t.split('**').forEach((part, i) => {
        if (!part) return;
        if (i % 2) {
          const b = document.createElement('strong');
          b.textContent = part;
          p.appendChild(b);
        } else {
          p.appendChild(document.createTextNode(part));
        }
      });
      return p;
    });
  }

  let resultShown = false;

  function showResult(firstName) {
    if (resultShown) return;
    resultShown = true;
    const key = resultKey();
    const r = results[key];

    const name = (firstName || '').trim();
    document.getElementById('result-intro').textContent =
      (name ? name + ', your' : 'Your') + ' full results are on their way to your inbox';
    document.getElementById('result-name').textContent = r.name;
    const [organ, emotion] = r.organ.split(' · ');
    document.getElementById('pill-organ').textContent = organ;
    document.getElementById('pill-emotion').textContent = emotion;
    document.getElementById('type-name-top').textContent = r.name;
    document.getElementById('type-organ-top').textContent = organ;
    document.getElementById('type-emotion-top').textContent = emotion;

    const reading = r.reading.slice();
    const duration = durationKey();
    if (durationLines[duration]) reading[2] = durationLines[duration] + ' ' + reading[2];
    document.getElementById('result-reading').replaceChildren(...paragraphs(reading));
    document.getElementById('result-tip').replaceChildren(...paragraphs(r.tip.map(t => t.replace(/"[^"]+"/g, q => '**' + q + '**'))));

    document.getElementById('offer-detail').textContent = r.offer;
    offerLinks.forEach(([a]) => { a.href = offerUrl(key); });
    document.getElementById('credit-line').hidden = !SHOW_CREDIT_LINE;

    // Close the phone keyboard before the email screen goes away.
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    quizQuestions.style.display = 'none';
    emailGate.classList.remove('visible', 'fade-in');
    setCompact(true);
    document.body.classList.add('has-result');
    fadeIn(resultCard);
    // Start the welcome video now that the result is on screen (once only).
    const welcomeVideo = resultCard.querySelector('.welcome-video iframe[data-src]');
    if (welcomeVideo && !welcomeVideo.getAttribute('src')) welcomeVideo.src = welcomeVideo.dataset.src;
    // Land on the very top, instantly. Swapping screens can leave the page far
    // down, and a smooth scroll back up gets cut short while the keyboard
    // closes, so set it now and again once the layout has settled.
    const toTop = () => window.scrollTo({ top: 0, behavior: 'instant' });
    toTop();
    requestAnimationFrame(toTop);
    setTimeout(toTop, 350);
  }

  // "Read them below" glides down to the full results (jumps if reduced motion is on).
  document.querySelector('.skip-line a').addEventListener('click', e => {
    e.preventDefault();
    const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.getElementById('full-results').scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
  });

  offerLinks.forEach(([a, target]) => {
    a.addEventListener('click', () => {
      track('tripwire_click', withPage({ product: 'gut_emotion_map', result: resultKey(), click_target: target }));
      try { if (typeof fbq === 'function') fbq('trackCustom', 'TripwireClick'); } catch (e) {}
    });
  });

  if (programLink) {
    programLink.addEventListener('click', () => {
      track('program_link_click', { button_location: 'quiz_result', result: resultKey() });
    });
  }

  backBtn.addEventListener('click', goBack);
  document.getElementById('encourage-btn').addEventListener('click', continueFromEncourage);

  // Init. Coming from the homepage quiz card, question 1 is already answered (?a1=W|P|H|M).
  (function () {
    const a1 = (new URLSearchParams(location.search).get('a1') || '').toUpperCase();
    const first = questions[0].options.find(o => o.type === a1);
    if (first) {
      answers.push(first);
      startSource = 'home_inline';
      quizStarted = true;
      track('quiz_start', withPage({ source: 'home_inline' }));
      currentQuestion = 1;
      setCompact(true);
    }
    renderQuestion(currentQuestion);
  })();

  /* ---------- Email gate ----------
     SendFox's form.js does the actual submit (reCAPTCHA + XHR) and then appends
     a .sendfox-message.success or .error paragraph to the form. We watch for that
     to reveal the result. Whatever happens, the result is always shown, so nobody
     gets stuck behind the form. */
  (function () {
    var form = document.getElementById('3ekowl');
    if (!form) { return; }
    var firstName = '';
    var settled = false;
    var timer = null;
    var adConversionSent = false;

    /* SendFox's form.js pulls in about 1MB of reCAPTCHA as soon as it runs,
       which made the quiz slow on phones. It is only needed for this form,
       so load it when the quiz ends instead of with the page.
       form.js wires itself up on DOMContentLoaded, which has already fired by
       then, so catch that listener while the script loads and call it. */
    var sendfox = null;
    window.mhLoadSendFox = function () {
      if (sendfox) { return sendfox; }
      sendfox = new Promise(function (resolve) {
        var add = document.addEventListener;
        var init = null;
        document.addEventListener = function (type, fn) {
          if (type === 'DOMContentLoaded') { init = fn; return; }
          return add.apply(this, arguments);
        };
        var s = document.createElement('script');
        s.src = 'https://cdn.sendfox.com/js/form.js';
        s.charset = 'utf-8';
        s.onload = function () {
          document.addEventListener = add;
          try { if (init) { init(); } } catch (e) { console.error('SendFox init failed:', e); }
          resolve(!!init);
        };
        s.onerror = function () {
          document.addEventListener = add;
          resolve(false);
        };
        document.body.appendChild(s);
      });
      return sendfox;
    };

    function ready() {
      return !!window.SENDFOX_FORM_LOADED && !!sendfox &&
        (form.getAttribute('data-recaptcha') !== 'true' || !!(window.grecaptcha && window.grecaptcha.ready));
    }

    // Resolves true once form.js and reCAPTCHA are ready, false if that takes over 10s.
    function whenReady() {
      return window.mhLoadSendFox().then(function (loaded) {
        if (!loaded) { return false; }
        return new Promise(function (resolve) {
          var start = Date.now();
          (function check() {
            if (ready()) { return resolve(true); }
            if (Date.now() - start > 10000) { return resolve(false); }
            setTimeout(check, 100);
          })();
        });
      });
    }

    function finish(ok, err) {
      if (ok) {
        try {
          gtag('event', 'quiz_lead', withPage({ lead_magnet: 'gut_emotion_quiz' }));
        } catch (e) {}
        // Google Ads conversion, once per page load.
        if (window.QUIZ_AW_CONVERSION && !adConversionSent) {
          adConversionSent = true;
          try { gtag('event', 'conversion', { send_to: window.QUIZ_AW_CONVERSION }); } catch (e) {}
        }
        fbTrack('Lead');
      } else if (err) {
        console.error('Quiz email submit failed:', err);
      }
      if (settled) { return; }
      settled = true;
      clearTimeout(timer);
      showResult(firstName);
    }

    if (window.MutationObserver) {
      new MutationObserver(function (mutations) {
        mutations.forEach(function (m) {
          Array.prototype.forEach.call(m.addedNodes, function (n) {
            if (!n.classList || !n.classList.contains('sendfox-message')) { return; }
            if (n.classList.contains('success')) { finish(true); }
            else { finish(false, n.textContent || 'SendFox returned an error'); }
          });
        });
      }).observe(form, { childList: true });

      // form.js re-enables the button when the request ends. If it ends with
      // no message added (network error), fail straight away.
      var btn = form.querySelector('button');
      if (btn) {
        new MutationObserver(function () {
          if (!btn.disabled && timer && !settled) {
            setTimeout(function () {
              if (!settled) { finish(false, 'SendFox request failed'); }
            }, 50);
          }
        }).observe(btn, { attributes: true, attributeFilter: ['disabled'] });
      }
    }

    form.addEventListener('submit', function (e) {
      // form.js resets the form on success, so grab the name now.
      firstName = (form.querySelector('[name="first_name"]') || {}).value || '';
      if (!ready()) {
        // Still loading (or blocked): hold the submit, then hand it to form.js once
        // it's ready. Never let the browser post away from the page.
        e.preventDefault();
        e.stopImmediatePropagation();
        var btn = form.querySelector('button');
        if (btn) { btn.disabled = true; }
        whenReady().then(function (ok) {
          if (btn) { btn.disabled = false; }
          if (!ok) { finish(false, 'SendFox form.js or reCAPTCHA did not load'); return; }
          form.dispatchEvent(new Event('submit', { cancelable: true }));
        });
        return;
      }
      // Network errors and reCAPTCHA hangs only log inside form.js, so fall back on a timeout.
      clearTimeout(timer);
      timer = setTimeout(function () {
        finish(false, 'No response from SendFox after 10s');
      }, 10000);
    });
  })();
})();
