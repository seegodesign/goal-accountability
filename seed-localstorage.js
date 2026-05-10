(function () {
var STORAGE_KEY = "accountability-app";

function dateKey(daysAgo) {
var d = new Date();
d.setHours(12, 0, 0, 0);
d.setDate(d.getDate() - daysAgo);
return d.toISOString().slice(0, 10);
}

function buildMockState(weeks) {
var totalDays = weeks * 7;
var today = dateKey(0);
var goalTitles = [
  "Walk 20 minutes outside",
  "Read 25 minutes",
  "No phone first 30 minutes",
  "Workout 30 minutes"
];

var goals = goalTitles.map(function (title, gi) {
  var completionHistory = {};
  var run = 0;
  var longest = 0;
  var current = 0;

  for (var i = totalDays - 1; i >= 0; i--) {
    var key = dateKey(i);

    // Mostly done, occasional missed, some empty days
    var status = null;
    if ((i + 3 * gi) % 7 === 0) status = "missed";
    else if ((i + gi) % 5 !== 0) status = "done";

    if (status) {
      completionHistory[key] = {
        status: status,
        note: status === "done" ? "Completed as planned." : "Missed due to schedule."
      };
    }

    if (status === "done") {
      run += 1;
      if (i === 0) current = run;
    } else if (status === "missed") {
      run = 0;
    }

    if (run > longest) longest = run;
    if (i === 0 && status !== "done") current = 0;
  }

  return {
    id: "mock-goal-" + (gi + 1),
    title: title,
    createdDate: dateKey(totalDays + gi + 2),
    streakCount: current,
    longestStreak: longest,
    completionHistory: completionHistory
  };
});

var reflectionSnippets = [
  "Strong follow-through today. Momentum felt easier after starting early.",
  "Energy dipped mid-day, but I still did the minimum viable version.",
  "I overestimated my schedule. Need a simpler plan tomorrow.",
  "Stacking habits after lunch worked well.",
  "Phone boundaries made the evening much calmer."
];

var reflections = {};
for (var r = totalDays - 1; r >= 0; r--) {
  if (r % 4 !== 0) {
    reflections[dateKey(r)] = reflectionSnippets[r % reflectionSnippets.length];
  }
}

var prompts = [
  "What commitment mattered most today?",
  "What made today easier than yesterday?",
  "What did you learn about your resistance today?",
  "What would make tomorrow 5% better?",
  "What are you proud of that no one else saw?"
];

var promptResponses = [];
for (var p = totalDays - 1; p >= 0; p--) {
  if (p % 3 === 0) {
    var dk = dateKey(p);
    promptResponses.push({
      id: "mock-prompt-" + p,
      dateKey: dk,
      prompt: prompts[p % prompts.length],
      response: "Mock response for " + dk + ". Kept progress steady and adjusted when needed. Here is some extra text, I need this to be really long so that I can see what happens when users enter a proper journal prompt. Kept progress steady and adjusted when needed. Here is some extra text, I need this to be really long so that I can see what happens when users enter a proper journal prompt. Kept progress steady and adjusted when needed. Here is some extra text, I need this to be really long so that I can see what happens when users enter a proper journal prompt. Kept progress steady and adjusted when needed. Here is some extra text, I need this to be really long so that I can see what happens when users enter a proper journal prompt. Kept progress steady and adjusted when needed. Here is some extra text, I need this to be really long so that I can see what happens when users enter a proper journal prompt.",
      createdAt: new Date(dk + "T20:15:00").toISOString()
    });
  }
}

return {
  goals: goals,
  reflections: reflections,
  selectedPromptIndex: 0,
  promptResponses: promptResponses.reverse(), // newest first
  promptDraft: "",
  selectedPage: "dashboard",
  selectedReflectionDate: today,
  lastCelebrationDate: today
};
}

var mock = buildMockState(5); // 5 weeks
localStorage.setItem(STORAGE_KEY, JSON.stringify(mock));
console.log("Mock data seeded into localStorage key:", STORAGE_KEY);
console.log("Weeks seeded:", 5, "Reload the page now.");
})();
