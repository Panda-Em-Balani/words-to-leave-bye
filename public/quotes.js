/* =============================================================================
   WORDS TO "LEAVE, BYE."  --  THE QUOTE BOOK
   =============================================================================

   House style: The Art of Ragebait.

   Every quote is shaped like ancient wisdom and then collapses into something
   petty, lazy, greedy, cowardly or just blandly literal. Delivered with total
   confidence. Attributed, always, to a man who never said any of it.

       "Confidence is key... even when you're wrong."
                                    -- Probably some random person

   THIS IS THE ONLY FILE YOU NEED TO EDIT TO ADD YOUR OWN.

   Each quote looks like this:

       { text: "The thing you want it to say." },

   RULES OF THE HOUSE
   ------------------
   1. Write {name} anywhere you want her name to appear. The app swaps it for
      whatever she typed on the welcome screen.
        e.g.  { text: "Effort is a choice, {name}. Choose the other one." }

   2. Leave "by" out and it is signed "Probably some random person", which is
      the joke. Add "by" when you want a different bad source -- a reel, a meme
      page, somebody you cannot remember. The worse the source, the better:
        { text: "...", by: "From an IG reel I saw last week" }
        { text: "...", by: "I forgot who said this" }
        { text: "...", by: "Suntzu, the art of ragebate" }

   3. If your quote contains a double quote character, put a backslash in front
      of it:  "She said \"no\" and meant it."
      Apostrophes are fine as-is.

   4. Keep the shape: wise opening, disappointing ending. Short beats long.
      The funniest ones sound like advice right up until the last four words.

   5. Add as many as you like. Delete any of mine that are not funny. The app
      counts them automatically -- there is nothing else to update.

   ============================================================================= */

/** Signed this way unless a quote overrides it. The consistency is the joke. */
export const DEFAULT_BY = 'Probably some random person';

export const QUOTES = [
  // --- Work, and the money that is the only reason for it ---------------------
  { text: "I only work because of the money.", by: "From an IG reel I saw last week" },
  { text: "Hard work pays off, but so does knowing the manager." },
  { text: "Do what you love and you will work every day of your life, for very little money." },
  { text: "The early bird gets the worm. The late bird gets to sleep. Choose wisely, {name}." },
  { text: "Never do today what somebody else will do on Thursday." },
  { text: "A promotion is just more work with a nicer word on it." },
  { text: "If you are the smartest person in the room, leave. They will make you do everything." },
  { text: "Work smarter, not harder. Then work less. Then stop." },
  { text: "Money cannot buy happiness, but I have never once seen a sad person on a jet ski." },
  { text: "Give a man a fish and he eats for a day. Teach a man to fish and he stops replying." },
  { text: "Your salary is a bribe to stop you doing what you actually want." },
  { text: "Always negotiate. The worst they can say is no, and you were leaving anyway.", by: "I forgot who said this" },
  { text: "The best time to look for a new job was two years ago. The second best time is this meeting." },
  { text: "Nobody is ever promoted for the work. They are promoted for being nearby." },
  { text: "Never be the person who knows how the system works. You will fix it forever." },
  { text: "If they say we are a family, run. Families do not do performance reviews." },
  { text: "Take the money, {name}. The passion will find you later, or it will not, and you will be rich." },
  { text: "Choose a job you love and you will never be able to complain about it. Choose carefully." },
  { text: "Do not work for free. Do not work for cheap. Ideally, do not work." },
  { text: "Success is showing up. Greatness is showing up late and unbothered." },

  // --- The dream, and continuing to sleep through it --------------------------
  { text: "Don't give up on your dream, just keep sleeping." },
  { text: "Discipline is doing what must be done. Wisdom is noticing it did not need doing." },
  { text: "Rome was not built in a day, because they took weekends off like normal people.", by: "Some meme page at 2am" },
  { text: "If at first you don't succeed, that is probably enough information." },
  { text: "The journey of a thousand miles begins with wondering whether you can drive it." },
  { text: "Consistency is key, {name}. So is quitting things that have become annoying." },
  { text: "You can do anything you set your mind to. Setting your mind to it is the hard part, so no." },
  { text: "Effort is a choice, {name}. Choose the other one." },
  { text: "The grind never stops. That is a design flaw, not a compliment." },
  { text: "Do not put off until tomorrow what you could cancel entirely." },
  { text: "There is no elevator to success. There is a chair, though, and you may sit in it." },
  { text: "A goal is just a plan you have not abandoned yet." },
  { text: "Waking up early adds hours to your day. That is more day. Think carefully." },
  { text: "Fall seven times, stand up eight. Or stay down. Nobody is counting but you.", by: "A LinkedIn post, unfortunately" },
  { text: "The secret to productivity is a very low definition of productive." },
  { text: "Dream big. Sleep bigger." },

  // --- Confidence, unearned -----------------------------------------------------
  { text: "Confidence is key... even when you're wrong." },
  { text: "Believe in yourself, {name}, especially when the evidence does not." },
  { text: "You do not need to be right. You need to say it first and loudly." },
  { text: "Admitting you were wrong builds character. Never admitting it builds a career." },
  { text: "Fake it till you make it. If you never make it, keep faking it. Nobody has noticed so far." },
  { text: "Speak with authority, {name}. Facts are a formatting choice." },
  { text: "The most confident person in the room is usually the least prepared. Be that person." },
  { text: "Never say I do not know. Say I will get back to you, and then do not." },
  { text: "Say it confidently enough and people will assume you did the reading.", by: "Overheard in the pantry" },
  { text: "There are no stupid questions, only stupid people asking them in front of everyone." },
  { text: "Certainty is not the same as being correct, but it looks identical in a meeting." },
  { text: "If you cannot be right, be fast. Nobody fact-checks fast." },

  // --- Friendship, loyalty, and the limits of both ------------------------------
  { text: "If someone tells you a secret, tell everyone else so you don't forget it." },
  { text: "A true friend stabs you in the front, which is at least more polite." },
  { text: "Keep your friends close and your enemies closer. The gossip is better that way." },
  { text: "Be loyal. Not so loyal that you miss a better offer." },
  { text: "The best way to keep a secret is to tell nobody. The second best is to tell {name}." },
  { text: "Friends are the family you choose, which means you may also unchoose them." },
  { text: "If they only call you when they need something, at least they call." },
  { text: "Forgive your enemies. Write it down first.", by: "Suntzu, the art of ragebate" },
  { text: "Trust everyone, {name}. Count your things afterwards." },
  { text: "Surround yourself with people smarter than you, then take credit for the room." },
  { text: "A friend will help you move. A best friend will tell you not to bother." },
  { text: "Never explain yourself to people who have already decided. Explain yourself to people who might promote you." },

  // --- Wisdom, arriving and immediately leaving ---------------------------------
  { text: "The wise man knows that he knows nothing. That is why nobody asks him anything." },
  { text: "Everything happens for a reason. The reason is usually a bad decision." },
  { text: "What does not kill you makes you stronger, or tired. It is mostly tired." },
  { text: "Time heals all wounds, and so does ignoring them for long enough." },
  { text: "Live in the moment, {name}. The other moments are worse." },
  { text: "Be the change you wish to see in the world, or complain, which is faster." },
  { text: "Life is a journey. Nobody said it was a good one.", by: "lao tzu, the art of ragebait" },
  { text: "The truth will set you free, but first it will get you uninvited." },
  { text: "You only live once, which is honestly plenty." },
  { text: "Karma is real. She is simply very slow and easily distracted." },
  { text: "The universe has a plan for you. It is not a good plan, but it is a plan." },
  { text: "Every ending is a new beginning, which is exhausting when you think about it." },
  { text: "Happiness comes from within. Unfortunately, so does anxiety." },
  { text: "The greatest wisdom is knowing when to stop talking. I have never once had it." },
  { text: "Look for the silver lining. If there is not one, look at something else." },
  { text: "The river does not fight the rock. The river goes around it and pretends that was the plan." },
  { text: "Empty your mind. Mine has been empty since Tuesday and I feel wonderful." },
  { text: "He who knows does not speak. He who speaks is usually in the meeting with me.", by: "Some guy on TikTok" },

  // --- Self-improvement, improved into nothing ----------------------------------
  { text: "Love yourself, {name}. Nobody else has volunteered." },
  { text: "Comparison is the thief of joy, but at least you know where you stand." },
  { text: "Be yourself, {name}. If that is not working, try somebody else." },
  { text: "Self care is important, {name}. Cancel the plans. Cancel all of the plans." },
  { text: "Your only competition is yourself, {name}, and honestly, you are not doing great either." },
  { text: "Growth is uncomfortable. So is staying the same. Pick the one with snacks." },
  { text: "New year, new me. Same problems, better excuses." },
  { text: "Meditation is sitting quietly and being annoyed on purpose." },
  { text: "Drink water, {name}. It fixes nothing, but you will briefly feel organised." },
  { text: "Set boundaries, {name}. Then apologise for them. Then remove them. That is the cycle." },
  { text: "Know thyself. Then keep it to yourself, because nobody asked.", by: "A Facebook comment section" },
  { text: "The first step to change is admitting there is a problem. The second step is optional." },

  // --- The office, and everything wrong with it ---------------------------------
  { text: "Reply all is not a mistake if you meant it." },
  { text: "The meeting could have been an email. The email could have been nothing." },
  { text: "Never volunteer, {name}. Volunteering is work with extra steps and no money." },
  { text: "Look busy long enough and people stop asking what you are doing." },
  { text: "Deadlines are suggestions with anxiety attached." },
  { text: "Always agree in the meeting. Do whatever you like afterwards." },
  { text: "The mute button is the greatest invention of our generation." },
  { text: "Nobody reads the document. Put anything in the document." },
  { text: "A quick call is never quick and rarely necessary." },
  { text: "The best feedback is the feedback you do not read.", by: "My cousin, who is not well" },
  { text: "Say yes to opportunities. Then find out what they were." },
  { text: "Do a job well and they give you more of it. Consider doing it adequately." },
  { text: "Being on time is a personality trait, not a virtue. Nobody is grateful." },
  { text: "Send it at 7am. Write it at 11pm. Let them think whatever they want." },
  { text: "The office fridge teaches you about people. It is not a good lesson." },
  { text: "Working from home is the same job in better trousers." },
  { text: "Every problem is an opportunity, mostly for somebody else." },
  { text: "You cannot pour from an empty cup, so stop offering people drinks." },
  { text: "Great teams communicate. Average teams have eleven group chats." },
  { text: "The org chart is fiction. Real power belongs to whoever books the rooms." },
  { text: "Per my last email is not passive aggressive. It is a receipt.", by: "The group chat" },
  { text: "Let us take this offline means I will never think about this again." },
  { text: "If the calendar invite has no agenda, neither do you. Attend accordingly." },

  // --- Money, briefly, before it goes ------------------------------------------
  { text: "Save for a rainy day. Then it rains and you learn it was not enough." },
  { text: "Money talks. Mine mostly says goodbye." },
  { text: "Invest in yourself. It is the only investment nobody can audit." },
  { text: "A budget is a plan you break on the same day you write it." },
  { text: "Buy the expensive one. The cheap one breaks and then you buy the expensive one." },
  { text: "Rich people are not smarter. They were simply earlier." },
  { text: "Never lend money to friends. Give it, then be quietly bitter forever." },
  { text: "The best things in life are free. The second best things are about four hundred dirhams." },
  { text: "You cannot take it with you, but you can absolutely spend it before you go.", by: "Sun Tzu, The Art of Ragebate" },
  { text: "Passive income is a beautiful phrase invented by people with active income." },

  // --- Proverbs, taken far too literally ---------------------------------------
  { text: "Do not count your chickens before they hatch. Count them after. Counting was never the hard part." },
  { text: "The pen is mightier than the sword, in most offices." },
  { text: "Actions speak louder than words, which is why I do neither." },
  { text: "You cannot judge a book by its cover, but you can save a great deal of time." },
  { text: "Two wrongs do not make a right. Three is a pattern, and now it is your brand." },
  { text: "Where there is smoke there is fire, and also somebody who should have mentioned it." },
  { text: "A watched pot never boils. Leave the kitchen and make it somebody else's problem." },
  { text: "Curiosity killed the cat. Nobody mentions that the cat was having a great time." },
  { text: "The grass is greener on the other side because they water it and you do not." },
  { text: "Do not bite the hand that feeds you. Hold it slightly too long instead.", by: "A tweet I cannot find again" },
  { text: "A bird in the hand is worth two in the bush, and is also a bird you now have to deal with." },
  { text: "Honesty is the best policy. It is not the best strategy. Know the difference, {name}." },

  // --- Wellness, unwell ----------------------------------------------------------
  { text: "Sleep is important. So is staying up until 2am for no reason. Balance." },
  { text: "Exercise releases endorphins. So does cancelling the membership." },
  { text: "An apple a day keeps the doctor away, which is not the same as being well." },
  { text: "Listen to your body. Your body is asking to lie down. Do that." },
  { text: "Stress is just your body being enthusiastic about a problem." },
  { text: "Take a deep breath. Take another. Now go back to being exactly as you were." },
  { text: "Rest when you are tired, {name}, not when you are finished. You will never be finished." },

  // --- The new job, and the new them ---------------------------------------------
  { text: "A new job is a chance to make new mistakes in front of new people." },
  { text: "Nobody at the new place knows what you are like yet, {name}. Use the window carefully.", by: "Somebody at the desk behind me" },
  { text: "First impressions last, so lower expectations early and coast." },
  { text: "Learn everyone's name in week one. Forget them in week two, like everybody else." },
  { text: "The best way to look busy somewhere new is to walk quickly while holding a laptop." },
  { text: "Ask questions in your first month. After that you are simply admitting things." },
  { text: "Every company says they are different. They all have the same printer." },
  { text: "Do not fix the broken process. Then it is yours forever." },
  { text: "You are only new for a little while, {name}. Panic accordingly." },
  { text: "A fresh start is the same you in a different building." },
  { text: "Nobody knows what they are doing. The good ones have simply stopped worrying about it." },
  { text: "You are not behind, {name}. There is no race. There is a leaderboard, though, and you are on it." },
  { text: "Career advice is older people describing luck.", by: "My other bestfriend" },
  { text: "The corporate ladder is a ladder in the sense that you can fall off it." },
  { text: "Everyone is winging it, {name}. Some people just have better wings." },
  { text: "Networking is making friends with a purpose, which ruins both." },
  { text: "Your CV is a work of fiction agreed upon by all parties." },
  { text: "The interview is not about skill. It is about whether they want to sit near you." },
  { text: "A notice period exists so you can practise not caring." },

  // --- Leaving. The actual reason this app exists. -------------------------------
  { text: "Distance means nothing, {name}, except geographically, where it means quite a lot." },
  { text: "Out of sight, out of mind, unless somebody builds you an app about it." },
  { text: "People come and people go. Some of them install software first." },
  { text: "If you miss someone, tell them. Or build a notification system, which is what I did." },
  { text: "Goodbyes are hard, {name}. That is why I did not say one. I made this instead.", by: "Lao Tzu, The Art of Nothing" },
  { text: "You will make new friends there, {name}. I am choosing not to think about that." },
  { text: "Never let someone leave without telling them how you feel. Or do, and be strange about it forever." },
  { text: "The people who matter stay in touch, {name}. The rest get a wave by the lift." },
  { text: "A leaving gift should be useful. This one is not. That is the entire point." },
  { text: "You are irreplaceable, {name}, which is their problem now and not yours." },
  { text: "They can transfer you. They cannot transfer the inside jokes. Those are non-negotiable assets." },
  { text: "The desk beside mine is still yours in spirit and still empty in the seating plan." },
  { text: "You did not leave the group chat. Know the difference." },

  // --- Petty wisdom, which is the best kind ---------------------------------------
  { text: "Take the high road. Then look down at everybody on the low road and feel wonderful." },
  { text: "Be humble. Make sure people know how humble you are being." },
  { text: "Apologise quickly and vaguely. Detail creates liability.", by: "From some funny page I follow" },
  { text: "Do not argue with fools. They have more practice and considerably more time." },
  { text: "Kill them with kindness. If that fails, kindness was never really the plan." },
  { text: "Let go of grudges. Store them somewhere accessible." },
  { text: "Rise above it. Then mention it once a year, casually, forever." },
  { text: "Choose your battles. Lose them politely. Remember everything." },
  { text: "The best revenge is living well. The second best is a very calm email." },
  { text: "Turn the other cheek. Keep a note of who made you." },
  { text: "Be the bigger person. Then bring it up at the leaving drinks." },

  // --- Time, which is not on your side --------------------------------------------
  { text: "Time is money, which explains why I am always late and broke." },
  { text: "Life is short. Meetings are long. Something is wrong with the mathematics." },
  { text: "Enjoy the little things, because the big things are mostly admin.", by: "A minion" },
  { text: "Do not wait for the perfect moment. Ruin an ordinary one." },
  { text: "Yesterday is history. Tomorrow is a mystery. Today is fine, I suppose." },
  { text: "You will regret the things you did not do, and several of the things you did." },
  { text: "Make time for what matters. Check what matters. It is usually lying down." },
  { text: "The days are long and the years are short. Nobody has explained this and I remain upset." },
  { text: "Someday is not a day of the week. Neither is Tuesday, emotionally." },
  { text: "Do it now, {name}. Or later. Later is also a valid time." },
  { text: "Patience is a virtue, mostly for people who are not waiting on you." },

  // --- Love and other unavailable things -------------------------------------------
  { text: "Love is patient. Love is kind. Love is also frequently unavailable." },
  { text: "Never chase anyone. Walk slowly in the same direction and see what happens." },
  { text: "If they wanted to, they would. If they did not, they were busy. Allegedly.", by: "Read it somewhere, probably wrong" },
  { text: "Keep your standards high and your expectations at zero." },
  { text: "The right person will come along, possibly after several extremely wrong ones." },

  // --- The app, aware of itself ------------------------------------------------------
  { text: "Wisdom cannot be taught. It can, however, be pushed to your phone at 8am." },
  { text: "A quote is an opinion wearing a nice font." },
  { text: "Do not believe everything you read, including this." },
  { text: "If you needed a notification to feel something today, that is fine. That is what it is for." },
  { text: "The master does not seek approval. The master checks his phone constantly." },
  { text: "There are two types of people, and neither of them is doing well." },
  { text: "{name}, this is your daily reminder that you are doing your best. Your best is what it is." },
  { text: "You did not choose this app. It was chosen for you. That is friendship." },
  { text: "Somebody thought about you today. It was a machine, but a person scheduled it.", by: "Uncle Danger, art of cook" },
  { text: "Reading a quote is not the same as changing. It is considerably easier, though." },
  { text: "The path to enlightenment is long. Fortunately you may simply scroll past it." },
  { text: "Not every day needs meaning, {name}. Some days only need to end." },
  { text: "You are exactly where you are meant to be. Geographically, at least." },
  { text: "If this made you laugh at work, act normal. Do not explain it. It never survives explanation." },
  { text: "The wise do not argue. The wise mute the thread." },
  { text: "Today's lesson: nothing. Take the day off, {name}." },
  { text: "Great things take time. So do bad things. Time is not the variable here." },
  { text: "Peace comes from within. So does hunger. Address whichever is louder." },
  { text: "You unlocked your phone to read this. That is the most productive thing either of us has done today." },
  { text: "That is all the wisdom I have. There will be more tomorrow, whether it is any good or not." },
  // --- Hating the same person, which is the real friendship ------------------------
  { text: "Friends who like the same things are fine. Friends who hate the same person are family." },
  { text: "Nothing bonds two people like a third person, {name}." },
  { text: "You cannot choose your colleagues. You can choose who to hate with.", by: "From an IG reel I saw last week" },
  { text: "We never agreed on lunch. We always agreed about him." },
  { text: "The enemy of my enemy is my lunch buddy." },
  { text: "A shared enemy is cheaper than therapy and works faster." },
  { text: "Some people are so annoying they accidentally create friendships." },
  { text: "If you both roll your eyes at the same second, that is a soulmate.", by: "I forgot who said this" },
  { text: "We do not talk behind their back. We talk in front of their empty chair." },
  { text: "The strongest bond is two people pretending to look at a spreadsheet." },
  { text: "You and me survived that person, {name}. No team building can do that." },
  { text: "Never explain why you hate them. The right person already knows.", by: "Suntzu, the art of ragebate" },
  { text: "Every office has one. Ours had one and we got each other out of it." },
  { text: "You do not need many friends, {name}. You need one witness." },

  // --- Friends because neither of us wanted to work --------------------------------
  { text: "We were not friends because of work. We were friends because neither of us wanted to do it." },
  { text: "Two lazy people together are not lazy. They are a department." },
  { text: "A team is just people avoiding work in the same room, {name}." },
  { text: "Nobody can catch you slacking if you are slacking together.", by: "Some meme page at 2am" },
  { text: "We never carried each other. We laid down at the same time." },
  { text: "Work is easier when somebody else is also not doing it." },
  { text: "They cannot say you are unproductive if the whole row is unproductive." },
  { text: "Alone you are lazy. Together you are a culture." },
  { text: "The best coworker is the one who also opens a spreadsheet and stares at it." },
  { text: "Productivity is a group activity. So is the opposite.", by: "lao tzu, the art of ragebait" },
  { text: "We did not waste time. We invested it in nothing." },
  { text: "Doing nothing is boring. Doing nothing with you was a whole career." },

  // --- Advantage, through being completely pathetic --------------------------------
  { text: "No one can betray you if nobody likes you, {name}." },
  { text: "They cannot give you more work if they cannot find you." },
  { text: "You cannot be replaced if nobody understands what you do." },
  { text: "Nobody can steal your ideas if you never have any.", by: "Suntzu, the art of ragebate" },
  { text: "They cannot reject your idea if you never say it." },
  { text: "The enemy cannot copy your work if your work is wrong." },
  { text: "If they can predict your next move, do not have one." },
  { text: "Nobody can misunderstand a message you never sent." },
  { text: "If you do not open it, it did not arrive." },
  { text: "You will never lose an argument you did not attend." },
  { text: "They cannot micromanage you if nobody knows what you actually do.", by: "A LinkedIn post, unfortunately" },
  { text: "You cannot be given more work if you already resigned, {name}." },

  // --- Mostly because --------------------------------------------------------------
  { text: "{name} stays calm in every meeting. Mostly because she does not know what it is about." },
  { text: "A true professional never panics. Mostly because she has not opened the email yet." },
  { text: "The wise woman agrees with everyone. Mostly because she stopped listening in 2019." },
  { text: "{name} agrees with everything in the meeting. Mostly because she joined nine minutes late." },
  { text: "A master never rushes. Mostly because he forgot it was due today.", by: "Sun Tzu, The Art of Ragebate" },
  { text: "She never complains about the work. Mostly because she has not started it." },

  // --- Meetings, and how to survive being in one -----------------------------------
  { text: "They cannot call on you in a meeting if your camera is off and your soul is also off." },
  { text: "A meeting is just work about work." },
  { text: "Say let us take that offline and nobody will ever ask again. Nobody takes it offline." },
  { text: "Never speak first in a meeting. Never speak second. Never speak." },
  { text: "The bravest thing in a meeting is silence. The second bravest is leaving.", by: "Overheard in the lift" },
  { text: "Every meeting could have been a message. Every message could have been nothing." },

  // --- Management, and other weather -----------------------------------------------
  { text: "A good manager listens. A great manager forgets he asked." },
  { text: "If they say we are a family, ask which one of us is adopted." },
  { text: "Every leader says his door is always open. Nobody says what happens if you walk in." },
  { text: "He is not a bad boss, {name}. He is a warning to others.", by: "Lao Tzu, The Art of Nothing" },
  { text: "They call it feedback because criticism is honest and honesty is not in the values." },

  // --- Email, and the slow war inside it -------------------------------------------
  { text: "The fastest way to clear your inbox is a new email address." },
  { text: "Per my last email is how professionals say what is wrong with you.", by: "The group chat" },
  { text: "Reply all is a weapon. Use it once and they will never forget." },
  { text: "Type it. Read it again. Delete it. Say noted." },
  { text: "Any email can be ignored if you are brave and slightly stupid." },

  // --- Leaving. Which is the entire point of this. ---------------------------------
  { text: "They said you were irreplaceable, then posted the job the same afternoon." },
  { text: "They will replace you in two weeks and still ask where the file is." },
  { text: "Leaving is easy. Explaining the folder structure is the hard part." },
  { text: "You are not losing a coworker, {name}. You are losing an alibi." },
  { text: "Who am I going to look at now when somebody says something stupid?" },
  { text: "The best exit strategy is having never entered.", by: "Suntzu, the art of ragebate" },
  { text: "Do not cry on your last day. Cry on the first day of the new one, like everybody else." },
  { text: "I am not in your contacts anymore, {name}. I am in your notifications." },
  { text: "New office, new people, same you. Sorry about that." },

  // --- Wisdom that fell down the stairs --------------------------------------------
  { text: "Why chase your dreams when you can just go back to sleep." },
  { text: "Do not carry the team. Put the team down." },
  { text: "Follow your heart. It is also lost, but now you have company.", by: "From some funny page I follow" },
  { text: "An empty calendar says more then a full one." },
  { text: "Do not do work. Work is for people with goals." },
  { text: "Do not give up on your dreams, {name}. Stay in bed with them." },
  { text: "If somebody microwaves fish, that is a declaration of war." },
  { text: "If they talk behind your back, walk slower so they struggle to keep up.", by: "ramiel_nge, art of fart" },
  { text: "GRABLONK. That is the wisdom. That is all.", by: "a minion" },

];

/* -----------------------------------------------------------------------------
   Anything below here is machinery. You do not need to touch it.
   ----------------------------------------------------------------------------- */

export const QUOTE_COUNT = QUOTES.length;
