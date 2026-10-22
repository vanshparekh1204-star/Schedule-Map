# Day Dial — User Guide

Day Dial is a daily planner built around a 24-hour dial. You set up your routines once, add one-off tasks as they come up, tick things off through the day, and watch your streaks and rewards build.

Everything stays on your computer. There is no account and nothing is sent anywhere.

---

## 1. Opening the app

### One-time setup
1. Double-click **`update-app.cmd`** in the project folder. It builds the app and opens `http://localhost:4517` in your browser.
2. In that window, install it as an app:
   - **Edge:** menu (⋯) → **Apps** → **Install this site as an app**
   - **Chrome:** the install icon at the right end of the address bar (or menu → **Install Day Dial**)
3. Right-click the **Day Dial** icon in the taskbar → **Pin to taskbar**.
4. Close the `update-app.cmd` window.

From now on, click the taskbar icon. It opens in its own window and **needs no server running**.

### If you didn't install it
Double-click **`Daily Planner.cmd`**. It starts the server and opens Day Dial in an Edge app window. Closing the black server window stops the app from loading.

### If the browser says "localhost refused to connect"
The server isn't running. Start it with `Daily Planner.cmd` or `update-app.cmd`, or open the installed app instead.

### After the code is changed
Run `update-app.cmd` again, then open the installed app once. It loads the new version by itself.

> **Keep the address `http://localhost:4517`.** Your data belongs to that address. A different port means an empty planner.

---

## 2. Finding your way around

On a computer, the left rail has: **Today, Calendar, Routines, Rewards, Insights, Settings**, plus an **Add a task** button, **Search (Ctrl K)** and **Shortcuts (?)**.

On a phone, the bottom bar has Today, Calendar, a big **+** button to add a task, Routines and Rewards. Search, Insights and Settings are at the top.

---

## 3. Today

The main screen. The big title is the day of the week.

- **The dial** shows the day as a 24-hour ring. Tasks with a set time appear as arcs at that time (as long as their duration). Tasks without a time sit in their part of the day (morning, afternoon, evening, night) as small jewels. A hand shows the current time.
- **The agenda** next to it lists the same tasks grouped by part of the day.
- **Tick a task** by clicking its round check button, or by clicking it on the dial. Click again to undo.
- Hovering a task highlights it on the dial, and the other way round.
- **Change day** with the arrows, the `←` `→` keys, or **Back to today**. You can look at yesterday or plan tomorrow; the day appears as "Tomorrow", "In 3 days", "2 days ago" and so on.
- **Rewards** you've created appear under the dial as a short line showing what's left.
- **Left over from earlier:** one-off tasks from the last two weeks that you never did show up in a box at the top. Use **Move to today** for one, or **Move all to today**.
- On a brand-new install, Today offers a few starter routines (Morning prayer, Brush teeth, Skincare, Drink 8 glasses of water, Read 20 pages, Evening walk). Click one to open it ready to edit.

### The menu on each task (⋯)
- **Skip this day**: leaves the day out without breaking your streak. Choose **Undo skip** to bring it back.
- **Change time for this day / Set a time for this day**: moves just that one day's time. The routine itself stays the same. A "Moved for this day" note appears; **Back to usual time** undoes it.
- **Move to today / Move to tomorrow / Move to the next day** (one-off tasks only).
- **Edit**.
- **Pause routine** (routines only).
- **Delete task / Delete routine**.

Deleting, skipping, pausing and moving all show an **Undo** button for a few seconds.

---

## 4. Adding tasks

There are two ways. Press **N** anywhere (or click **Add a task**).

### Quick add (type one line)
Type it the way you'd say it. Under the box, chips show what Day Dial understood, so you can see it before you add. Press **Enter** to add, or **More options** to open the full form with everything filled in.

Examples:
- `skincare every night for 1 month #self-care`
- `gym mon, wed and fri 7am for 1 hour`
- `call the bank tomorrow 11am !high`
- `water the plants every 3 days`

What you can put in the line:

| You want | Type |
|---|---|
| High priority | `!high` (also `!h`, `!!`) |
| An area | `#faith`, `#self-care`, `#work` ... (a unique start of the name also works) |
| A time | `9pm`, `7:30am`, `18:30`, `noon`, `midnight` |
| How long it takes | `for 1 hour`, `30 min`, `45m`, `2h` |
| A part of the day | `in the morning`, `this evening`, `tonight`, or `every morning` |
| One day | `today`, `tomorrow`, `friday`, `next friday`, `15 mar`, `mar 15`, `15/3` |
| Repeat every day | `every day`, `daily`, `each day` |
| Repeat on days | `weekdays`, `weekends`, `every mon, wed and fri`, `on tuesdays` |
| Repeat every few days | `every other day`, `every 3 days` |
| Leave days out | `except fridays`, `but not on sunday` |
| Start later | `from monday`, `starting 1 apr` |
| Stop it | `for 2 weeks`, `for 1 month`, `until 30 jun`, `10 times` |

Anything it doesn't recognise becomes the task's name. Note that "on friday" on its own means *that one Friday*, but "on fridays" or "every friday" repeats.

Areas that don't exist (e.g. `#gardening`) are left in the title. Create the area in Settings first.

### The full form
Press **Ctrl K** and choose **New task with all options**, or click **More options** in quick add.

- **Name** and **Notes** (optional).
- **Priority**: General or High (shown with a small red diamond).
- **Area**: Faith, Self-care, Health, Work, Home, or your own.
- **When in the day**: either a *part of the day* (morning, afternoon, evening, night, any time) or *at a set time* with an optional length (5 minutes up to 2 hours).
- **Repeat**: *Just once*, *Every day*, *Certain days* (pick weekdays, with Weekdays/Weekends shortcuts), or *Every few days* (every 2–60 days).
- **Starts** (or **Day** for a one-off).
- **How long it runs**: no end, 1 week, 2 weeks, 1 month, 3 months, until a date, or a number of times.
- **Days to leave out**: holidays, travel, rest days.
- A **preview** card shows the schedule in words, the next six days it will appear, and the last day.

### Editing a routine's schedule
When you change the schedule of a routine that already has history, you choose:
- **All days, past too**: the past is recounted with the new schedule.
- **Today onwards**: the old version stays for past days and a new one starts today, so your history stays as it was.

---

## 5. Calendar

- **Month view**: each day is a small dial. The gold ring shows how much of that day you kept; small ticks show tasks planned ahead; a red diamond means a high-priority task is still open. Click a day to see it in the panel beside the calendar, tick things off, add a task for that date, or **Open on the dial**.
- **Week view**: a sheet with a column for each day and a row for each part of the day. Click a task to tick it. On a phone it becomes one block per day.
- Use the arrows (or `←` `→`) to move by a month or a week, and **Today** to jump back.

---

## 6. Routines

The place to manage everything you've set up. Two tabs:

- **Routines** (anything that repeats), filtered by **Active / Paused / Ended**. Each row shows how it repeats, the time, the area, the last 14 days as dots (gold = kept, dashed = skipped, grey = missed, ringed = still open), and the **current streak** (with your best if it was higher).
- **One-off** tasks, sorted into *Not done yet, from earlier*, *Coming up* and *Done or skipped*.

You can search by name and filter by High priority or by area.

The ⋯ menu on a routine has **Edit, Duplicate, Pause / Resume, End it (keep the history)** and **Delete with its history**.

- **Pause** hides a routine until you resume it (good for holidays or illness). Paused days don't count against you.
- **End it** stops it from today but keeps everything you did for Insights.
- **Delete** removes it and its history (undoable for a few seconds).

---

## 7. Rewards

Rewards are deals with yourself: *keep enough of this week, and next week you've earned something.*

### How it works
Each period (a week or a month), Day Dial scores the share of your planned tasks that you kept. The highest tier you reach decides how many of the reward you get **next** period. The very first period uses a starting amount, since there's no score yet.

Example, "Order food", scored weekly:
- Keep 80% or more → 3 orders next week
- Keep 60%–79% → 2 orders
- Below that → 1 order

### Creating one
Go to **Rewards** → **Start from the example** (or **Start from scratch** / **Create a reward**).

- **Reward** and **One of it is called** (e.g. "Movie night" / "movie").
- **Scored over**: a week or a month.
- **Which tasks count**: all tasks, high-priority only, one area, or one routine.
- **What each score earns**: levels like "keep at least 80%, earn 3". Add or remove levels.
- **For the first week/month**: the starting amount.
- **Skipped tasks count as missed**: off by default, so rest days don't hurt your score.
- **Unused ones carry over**: off means leftovers expire at the end of the period.
- **Show on Today**: turn off to hide it without losing its history.

### Using it
On the Rewards page you see:
- How many you have **left this week/month** (shown as coins) and where they came from.
- **Use 1 …**: press it when you spend one. Each use is listed with its time and can be given back with **Give back** (or **Undo** right after).
- **Earning for next week/month**: your current score and which level you're on, with a meter marking each level.
- A **Past weeks/months** table: how much you kept, what you had, and what you used.

---

## 8. Insights

Patterns from your history. Appears once you have tasks.

- **Kept this week**, **Last 30 days**, and **Full days this month** (days where every planned task was kept).
- **The year so far**: one dot per day, deeper gold = more of that day kept; hollow = nothing planned.
- **By weekday**: your share kept on each weekday over the last 12 weeks, so you can see your best and worst days.
- **Week by week**: the last 12 weeks.
- **By area**: your last 30 days by area (Faith, Health, Work ...).
- **Longest running**: your top streaks right now, with each one's best.

Every chart has a **See the numbers** link that shows the same data as a table. Hover or focus a bar or dot for details.

---

## 9. Settings

- **Theme**: System, Light or Dark. The slowly moving enamel background behind every page follows the theme. If your computer is set to reduce motion, it stays still.
- **Weeks start on**: Monday or Sunday (affects the calendar, insights and weekly rewards).
- **The day ends at**: midnight, or 1–4 am. If you're often up late, "today" continues past midnight, so a 1 am task still counts for the day before.
- **Areas**: rename, add (e.g. Study), and remove unused ones. Areas let you sort tasks and score rewards and insights by part of life.
- **Backup**:
  - **Export a backup** saves a file to your Downloads folder.
  - **Restore from a backup** replaces everything with the file's contents.
  - It shows how long ago your last backup was.
- **Open it in one click**: the install steps again.
- **Erase everything**: deletes all tasks, routines, rewards and history from this browser. Can't be undone.

### Please back up now and then
Your data lives in the browser. Clearing the browser's site data for `localhost` would erase it. Export a backup after setting things up and every few weeks after that. Day Dial asks the browser to keep the data safe, but a backup file is the only real guarantee.

---

## 10. Keyboard shortcuts

| Key | What it does |
|---|---|
| **N** | Quick add a task |
| **Ctrl K** | Search tasks and pages, run commands (new task, light/dark theme, shortcuts) |
| **T** | Go to Today |
| **C** | Calendar |
| **R** | Rewards |
| **I** | Insights |
| **← →** | Previous / next day (a week in the Calendar's week view) |
| **?** | Show the shortcut list |

Keys are ignored while you're typing in a box or while a dialog is open. In the **Ctrl K** search you can also type a task's name to jump straight to editing it.

---

## 11. Tips

- Set up your whole routine on day one (use quick add), then just tick things off.
- Use **Skip this day** instead of leaving a task unticked when you've decided not to do it. Your streak and reward score aren't hurt.
- Use **Pause** for a break of a few days or weeks, and **End it** when a routine is truly over.
- Start a reward with generous levels, then raise them as the habit sticks.
- Look at **By weekday** in Insights: if one day is always weak, plan fewer tasks for it.

---

## 12. Troubleshooting

| Problem | What to do |
|---|---|
| "localhost refused to connect" | The server isn't running. Open the installed app, or run `Daily Planner.cmd` / `update-app.cmd`. |
| The planner is empty | You probably opened it at a different address or port. Use exactly `http://localhost:4517` (or the installed app). Restore a backup if needed. |
| Port 4517 already in use | Close the other Day Dial server window or the program using the port, then try again. |
| Changes to the code don't show | Run `update-app.cmd`, then open the installed app once. |
| Something went wrong during the build | `update-app.cmd` stops with a message and leaves the installed app untouched. |
