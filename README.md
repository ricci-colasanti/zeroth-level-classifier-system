---

## Course Overview: Building a Bucket Brigade Classifier System

We'll build this in **8 progressive stages**:

| Stage | Topic | What You'll Build |
|-------|-------|-------------------|
| 1 | Environment Foundation | A grid world with food, rocks, and an agent |
| 2 | Agent Movement & Sensing | The creature can perceive and move in the grid |
| 3 | Classifier Representation | Rules that map "situations" to "actions" |
| 4 | Match & Select Mechanism | How the agent chooses which rule to fire |
| 5 | The Bucket Brigade (Core) | Backward credit assignment with "taxes" and "bids" |
| 6 | Genetic Algorithm Integration | Evolving better rules over generations |
| 7 | Complete Training Loop | Putting it all together to learn the forest navigation |
| 8 | Analysis & Visualization | Tracking performance, rule evolution, and learning curves |

---

## Stage 1: Environment Foundation

### Learning Objectives
- Understand the grid world representation
- Define the agent's state space
- Implement basic environment mechanics

### Core Concepts to Understand

#### Grid World Design
The environment is a **discrete 2D grid** where each cell can be:
- `EMPTY` (0) - The creature can traverse this
- `WALL` (1) - A boundary the creature cannot cross
- `ROCK` (2) - An obstacle, treated as a "soft wall" (negative but not fatal)
- `FOOD` (3) - The goal, which gives a reward

#### Agent State Representation
The creature needs to perceive its environment. For a simple but effective representation, we'll use the **nearest obstacle detection** approach:

```
Perception Vector = [N, NE, E, SE, S, SW, W, NW, FoodDirection]
```

Where each direction cell is encoded as:
- `0` = empty
- `1` = rock
- `2` = wall (or boundary)
- `3` = food

The `FoodDirection` is a special sensor that indicates whether food is:
- `-1` = no food detected
- `0` = directly north
- `1` = northeast
- ... etc around the 8 compass directions

#### Implementation Strategy
For this stage, your code should:
1. Create a grid (say 20x20) with random rock placement
2. Place the creature at a random position
3. Place food at a random position (not too close to the creature)
4. Provide a method to display the grid state
5. Implement a `get_perception(x, y)` function that returns the 9-element perception vector for a given position

#### Test Your Understanding
Before coding, think about:
- Why do we use the **nearest obstacle** rather than the exact distance? (Hint: generalization)
- Why can't we just use absolute coordinates (x, y) as the agent's state?
- What edge cases do you need to handle when the agent is at the grid boundary?

### What Your Code Should Do at the End of Stage 1
When you run your code, you should see:
```
Grid World (20x20):
. . . . . . . . . . . . . . . . . . . .
. . . . . . . . . . . . . . . . . . . .
. . . R . . . . . . . . . . . . . . . .
. . . . . . . . . . . R . . . . . . . .
. . . . . . . . . . . . . . . . . . . .
. . . . A . . . . . . . . . . . . . . .
... (and so on)
Food at: (15, 3)
Agent at: (5, 5)
Perception at (5,5): [0,0,0,0,0,0,0,0, -1]
```
Where `A` = agent, `R` = rock, `F` = food, and `.` = empty.

---

## Stage 2: Agent Movement & Sensing

### Learning Objectives
- Implement agent movement with boundary checking
- Create a reward function
- Build a step-by-step simulation loop

### Core Concepts to Understand

#### Action Space
The creature can perform these actions:
- `FORWARD` (0)
- `TURN_RIGHT` (1) 
- `TURN_LEFT` (2)
- `MOVE_BACKWARD` (3)

Note: We use **relative directions** (turn left/right) rather than absolute directions (north/east). This makes the agent's behavior **orientation-invariant**, which is crucial for learning because the rules can be reused regardless of which way the agent is facing.

#### Orientation Management
The agent has an internal orientation: `N, E, S, W` (0, 1, 2, 3). When it turns, this orientation changes. When it moves forward, it moves in its current facing direction.

#### Reward Structure
- **+1000** for reaching food (terminal reward)
- **-5** for hitting a rock (negative reinforcement)
- **-10** for hitting a wall (more severe, equivalent to falling off the edge)
- **0** for any "normal" movement step

#### Simulation Loop
The basic loop should:
1. Get the agent's perception
2. Select an action (at this stage, random)
3. Execute the action (update position and orientation)
4. Calculate the reward
5. Update the agent's state
6. Check if the agent reached food (episode ends)

#### Episode Structure
An "episode" is one attempt from start to reaching food (or a maximum step limit). At the start of each episode:
1. Reset the agent to a random position
2. Reset the food to a random position (or keep it fixed for simplicity)
3. Reset any internal state
4. Run until success or timeout

### Test Your Understanding
Think about:
- Why use relative directions instead of absolute? Consider an agent learning in a square room versus a complex maze.
- What happens if we simply move the agent in a random direction? How can we measure "improvement"?
- What should happen if the agent reaches the food? Should the episode end immediately?

### What Your Code Should Do at the End of Stage 2
When you run your code:
```
Agent at (5,5) facing NORTH
Action: FORWARD -> New position (5,4), facing NORTH, Reward: 0
Action: TURN_RIGHT -> Position (5,4), facing EAST, Reward: 0
Action: FORWARD -> Position (6,4), facing EAST, Reward: 0
Action: FORWARD -> Position (7,4), facing EAST, Reward: -5 (hit rock!)
Action: TURN_LEFT -> Position (7,4), facing NORTH, Reward: 0
...
Action: FORWARD -> Position (15,3), facing NORTH, Reward: 1000 (found food!)
Episode completed in 42 steps
```

---

## Stage 3: Classifier Representation

### Learning Objectives
- Design the classifier structure (rules)
- Implement condition matching
- Create the classifier population
- Understand the difference between a "classifier" and an "action"

### Core Concepts to Understand

#### What is a Classifier?
A classifier is a rule of the form:
```
IF [condition] THEN [action]
```
With an associated `strength` (fitness/utility).

The **condition** in our system will be a pattern that matches the agent's perception. We'll use a **triplet representation** for each direction sensor:

```
Condition = [sensor1, sensor2, ..., sensor9]
Where each sensor can be: 0 (empty), 1 (rock), 2 (wall), 3 (food), or # (wildcard)
```

Wait - this creates a combinatoric explosion! The perception vector has 9 sensors, each can be 4 values. That's 4⁹ = 262,144 possible conditions. With wildcards, it's even more!

**The Solution: Generalization with Wildcards**
We allow `#` as a wildcard that matches anything. This drastically reduces the number of rules needed and allows the system to generalize across similar situations.

#### Classifier Structure
```
Classifier:
  - condition: list of 9 values (each 0-3 or #)
  - action: one of {0, 1, 2, 3}
  - strength: float (initialized to a default, say 10.0)
  - bid_ratio: float (e.g., 0.1, the fraction of strength to bid)
  - tax_rate: float (e.g., 0.02, the "cost of living")
```

#### Matching Function
A classifier matches a perception if each non-wildcard condition value equals the perception value at that position.

Example:
```
Perception: [0, 0, 0, 0, 0, 0, 0, 0, -1]
Classifier: [0, 0, 0, 0, #, #, #, #, -1]  -> MATCHES!
Classifier: [0, 0, 0, 1, #, #, #, #, -1]  -> DOES NOT MATCH (position 4)
```

#### Initial Population
Start with a random population of say 400 classifiers. Each classifier:
- Condition: Randomly generated (each sensor either a specific value or `#`)
- Action: Randomly chosen
- Strength: 10.0

#### Why This Representation?
- **Generalization**: Wildcards allow rules to apply to many situations
- **Coverage**: Even with a modest population size, the system can cover most of the state space
- **Specificity**: More specific rules (fewer wildcards) can specialize in particular situations

### Test Your Understanding
Consider these questions:
- What happens if ALL sensors are wildcards (#)? When would such a rule be useful?
- What happens if NO sensors are wildcards? What are the pros and cons?
- How do you ensure the initial population covers enough of the state space?

### What Your Code Should Do at the End of Stage 3
When you test your implementation:
```
Initialized 400 classifiers
Population coverage: 73% of possible perception-action pairs

Example Classifier:
  Condition: [0, #, #, #, #, 1, #, #, -1]
  Action: FORWARD (0)
  Strength: 10.0

Matching test:
  Perception: [0, 0, 0, 0, 0, 1, 0, 0, -1] -> MATCHES!
  Perception: [0, 0, 0, 0, 0, 0, 0, 0, -1] -> NO MATCH
```
You should also be able to display the full population and query which classifiers match a given perception.

---

## Stage 4: Match & Select Mechanism

### Learning Objectives
- Implement the "auction" mechanism for rule selection
- Understand bidding and competition
- Handle the "action set" concept
- Manage rule activation

### Core Concepts to Understand

#### The Auction Mechanism
When a perception is received, all classifiers that match it are candidates for firing. They must "bid" for the right to act. The bid is calculated as:

```
Bid = strength * bid_ratio
```

Where `bid_ratio` is typically 0.1 (the classifier bids 10% of its strength).

#### Selection Process
1. Find all classifiers that match the current perception (the **match set**)
2. If the match set is empty, the agent performs a random action (and we'll need to create new rules later)
3. Each classifier in the match set calculates its bid
4. The classifier with the highest bid "wins" and gets to post its action
5. The winning classifier pays its bid (strength -= bid)

#### The Action Set (Important!)
The classifier that fires posts its action to the environment. However, the **action set** is the set of all classifiers from the match set that **would have performed the same action**.

Why this matters: The winning classifier is the one that acts, but *all* classifiers in the action set will share in the future reward. This allows competing rules to learn from each other's successes.

#### Tax and Lifecycle Costs
Every classifier pays a small "tax" each step to simulate the cost of maintaining a rule:
```
Strength -= strength * tax_rate
```
Where `tax_rate` is typically 0.01-0.02. This prevents useless rules from accumulating strength indefinitely.

#### Coverage and "Majority Rule"
If no classifiers match (match set is empty), we have a **coverage problem**. The solution:
1. Perform a random action
2. Create a new classifier that matches the current perception
3. The new classifier will be weak initially but can grow strong if useful

### Test Your Understanding
Think deeply about:
- Why do classifiers pay their bid even before knowing if the action was successful? (Hint: opportunity cost)
- What happens if a very high-strength classifier matches frequently? What's the risk?
- Why include all classifiers in the action set, not just the winner?
- What is the "exploration vs exploitation" tradeoff here?

### What Your Code Should Do at the End of Stage 4
When you run a step:
```
Current Perception: [0, 0, 0, 0, 0, 0, 0, 0, -1]
Match set size: 12
Classifiers in match set:
  ID 37: strength=23.4, bid=2.34, action=FORWARD
  ID 89: strength=18.2, bid=1.82, action=FORWARD
  ID 156: strength=31.0, bid=3.10, action=TURN_RIGHT  <- WINNER!
  ID 203: strength=12.1, bid=1.21, action=TURN_RIGHT
  ID 278: strength=19.7, bid=1.97, action=TURN_LEFT

Winner: ID 156 (action=TURN_RIGHT, strength becomes 27.9)
Action set (TURN_RIGHT): [ID 156, ID 203]
Executing action: TURN_RIGHT
```
You should also track total steps, rewards collected, and maintain statistics on which actions are most frequently chosen.

---

## Stage 5: The Bucket Brigade (Core Implementation)

### Learning Objectives
- Implement the backward credit assignment mechanism
- Manage the "bucket" chain
- Handle reward distribution
- Understand the "payment chain" and "taxation"

### Core Concepts to Understand

#### The Bucket Brigade Chain
The algorithm maintains a **chain of classifiers** that were active in the last few steps. When a reward arrives, it flows backward along this chain:

```
Time t:   Classifier A fires
Time t+1: Classifier B fires
Time t+2: Classifier C fires
Time t+3: Classifier D fires -> REWARD RECEIVED!
```

The reward flows from D → C → B → A

#### Reward Distribution Algorithm
When the agent receives a reward `R` from the environment:

1. **Last Classifier**: The classifier that just fired (D) receives the reward directly:
   ```
   D.strength += R
   ```

2. **Previous Classifiers** (Backward Propagation):
   For each previous classifier in the chain (C, then B, then A):
   ```
   payment = current_classifier.bid * 0.5  (or some multiplier)
   previous_classifier.strength += payment
   ```
   The `0.5` is the **discount factor** - it represents that earlier actions were less directly responsible for the reward.

3. **Taxation**: After each step, all classifiers pay their tax:
   ```
   strength *= (1 - tax_rate)
   ```

#### The Bid/Update Cycle
During normal operation (no reward):
1. Classifier wins the bid: `strength -= bid`
2. The "bid" amount is held in a temporary pool
3. When a reward arrives, this pool is used to pay previous classifiers
4. If no reward arrives (failure), the bid payment is simply lost

This creates a **market economy** where classifiers "pay" to act, and successful actions ultimately pay back those who set the stage.

#### Chain Management
Maintain a history of the last N classifiers that fired (typically 3-10 steps):
```
classifier_history = []  # List of (classifier, timestamp)
```
When a reward arrives, iterate through the history in reverse order.

#### The "Default Hierarchy" Emergence
Over time, this system naturally creates a hierarchy:
- **High-level rules**: Broad conditions (# wildcards) that set general direction
- **Low-level rules**: Specific conditions that handle exact situations
- The Bucket Brigade ensures both are reinforced appropriately

### Test Your Understanding
These are critical concepts to grasp:
- Why is the discount factor (0.5) important? What if it were 1.0? What if it were 0.1?
- What happens to a classifier that fires right before a reward?
- What happens to a classifier that fires right after the reward? (It won't be in the chain!)
- How does the tax rate affect rule specialization vs. exploration?

### What Your Code Should Do at the End of Stage 5
When you run a complete episode with tracking:
```
Step 1: Classifier A fires (strength: 8.0 -> bid=0.8 paid)
Step 2: Classifier B fires (strength: 12.0 -> bid=1.2 paid)
Step 3: Classifier C fires (strength: 15.0 -> bid=1.5 paid)
Step 4: Found FOOD! Reward: +1000

Reward Distribution:
  C.strength: 15.0 + 1000.0 = 1015.0
  Payment from C to B: 1.5 * 0.5 = 0.75
  B.strength: 12.0 + 0.75 = 12.75
  Payment from B to A: 1.2 * 0.5 = 0.6
  A.strength: 8.0 + 0.6 = 8.6

Chain complete. History reset.
```
You should track the full chain and be able to display the bid amounts and resulting strengths.

---

## Stage 6: Genetic Algorithm Integration

### Learning Objectives
- Implement rule discovery through evolution
- Understand selection, crossover, and mutation
- Manage population size through roulette wheel selection
- Create new rules to replace weak ones

### Core Concepts to Understand

#### When to Evolve
The GA runs every **N steps** (e.g., every 25-50 steps) or every **M episodes**. At these intervals:
1. Select the strongest classifiers to reproduce
2. Apply crossover and mutation
3. Replace the weakest classifiers with the new offspring

#### Fitness Selection
Classifiers are selected for reproduction with probability proportional to their strength:
```
selection_probability = strength_i / sum(all strengths)
```
This is a **roulette wheel selection** where stronger rules are more likely to be chosen.

#### Crossover (Recombination)
Given two parent classifiers:
```
Parent 1: [0, 0, 0, #, #, #, #, #, -1] -> action=FORWARD
Parent 2: [#, 0, #, #, 1, #, #, #, -1] -> action=TURN_RIGHT
```

Crossover works by:
1. Selecting a random crossover point (say, position 4)
2. Swapping the condition components after that point
```
Child 1: [0, 0, 0, #, 1, #, #, #, -1] -> action=FORWARD
Child 2: [#, 0, #, #, #, #, #, #, -1] -> action=TURN_RIGHT
```

#### Mutation
With a small probability (e.g., 0.01 per position):
- Change a value to another allowed value (0-3 or #)
- Change the action to another action

#### Selection Pressure
We use **elitism**: The top 5-10% of classifiers are preserved unchanged. This prevents losing the best rules.

#### Population Management
- **Maximum population**: e.g., 800-1000 classifiers
- **Minimum population**: If below minimum, generate new random classifiers
- **Deletion**: When adding new classifiers, remove the weakest ones

### Test Your Understanding
Critical questions:
- Why use strength as fitness rather than, say, number of matches?
- What's the role of mutation in this system? When would a low mutation rate be better?
- How do we prevent the population from converging to a single type of rule?

### What Your Code Should Do at the End of Stage 6
When you run a GA cycle:
```
Generation 47 (running every 25 steps):
Population size: 450
Average strength: 23.7

Selected parents:
  Parent 1: ID 78 (strength 45.2)
  Parent 2: ID 156 (strength 38.9)

Crossover at point 5:
  Child 1: [0, 0, #, #, 1, 0, #, 0, -1] -> FORWARD
  Child 2: [#, 0, 0, #, #, #, #, #, -1] -> TURN_RIGHT

Mutation applied to Child 2 (position 7: 0 -> #)
  Child 2: [#, 0, 0, #, #, #, #, #, -1] -> TURN_RIGHT

Adding 2 children, removing weakest classifiers:
  Removed ID 302 (strength 2.1)
  Removed ID 419 (strength 1.8)

New population: 450
```
You should track population statistics, number of unique conditions, and the top 10 rules.

---

## Stage 7: Complete Training Loop

### Learning Objectives
- Integrate all components into a cohesive system
- Implement the full learning cycle
- Handle exploration vs exploitation
- Monitor learning progress

### Core Concepts to Understand

#### The Complete Algorithm
```
1. Initialize environment (grid world)
2. Initialize classifier population (400 random classifiers)
3. For each episode:
   a. Reset agent and food positions
   b. Reset classifier history
   c. For each step (max 200 steps):
      i. Get perception
      ii. Find match set
      iii. If match set empty: create new random classifier, action = random
      iv. Else: calculate bids, select winner, add winner to history
      v. Execute action, receive reward
      vi. Apply Bucket Brigade reward distribution
      vii. Apply taxes to all classifiers
      viii. If reward > 0 (found food): episode ends
      ix. If step count % GA_INTERVAL == 0: run GA cycle
   d. Record statistics (steps taken, reward earned)
```

#### Exploration vs Exploitation
We need a strategy for balancing:
- **Exploitation**: Following the best known rules (high bid wins)
- **Exploration**: Trying new things (sometimes pick a random action)

Approaches include:
- **Epsilon-greedy**: With probability ε, take a random action regardless of bids
- **Softmax exploration**: Pick actions with probability proportional to bid values
- Start with high exploration (ε=0.3) and decrease over time (ε=0.05)

#### Performance Metrics
Track these key indicators:
- **Steps to food**: Should decrease from 40+ to <6
- **Success rate**: Percentage of episodes that find food
- **Average bid**: Should increase as successful rules grow stronger
- **Population diversity**: Number of unique conditions vs total population

#### The "Cold Start" Problem
Initially, the agent has no useful rules. It must:
1. Explore randomly
2. Get lucky a few times to create strong rules
3. The GA propagates successful rules
4. Learning accelerates as good rules dominate

### Test Your Understanding
Consider the system as a whole:
- How do the Bucket Brigade and GA interact? Which one discovers new strategies, and which one refines them?
- Why do we need a maximum step limit per episode?
- How can we measure when the system has "learned" the task?

### What Your Code Should Do at the End of Stage 7
When you run the full training loop:
```
Episode 1: Steps=43, Reward=1000, Success=True
Episode 2: Steps=37, Reward=1000, Success=True
Episode 3: Steps=52, Reward=1000, Success=True
Episode 4: Steps=0, Reward=0, Success=False (timeout)
Episode 5: Steps=29, Reward=1000, Success=True
...
Episode 50: Steps=12, Reward=1000, Success=True
Episode 100: Steps=8, Reward=1000, Success=True
Episode 200: Steps=5, Reward=1000, Success=True
Episode 300: Steps=6, Reward=1000, Success=True
Episode 400: Steps=4, Reward=1000, Success=True
Episode 500: Steps=5, Reward=1000, Success=True

Average steps (last 50 episodes): 5.3
Success rate: 98%
Population size: 623
Average strength: 145.3
```
You should see the characteristic learning curve: rapid improvement initially, then stabilization at near-optimal performance.

---

## 📊 Stage 8: Analysis & Visualization

### Learning Objectives
- Track learning progress in detail
- Visualize the agent's strategy
- Analyze the classifier population
- Understand emergent behavior

### Core Concepts to Understand

#### What to Measure
- **Learning curve**: Steps per episode over time (1000+ episodes)
- **Rule strength distribution**: How many rules are strong vs weak
- **Action distribution**: Which actions are most frequently chosen
- **Rule specificity distribution**: How many wildcards vs specific values
- **Population dynamics**: How the population size changes over time

#### Visualization Techniques
Create visualizations of:
1. **Learning curve plot**: X=episode, Y=steps to food
2. **Moving average**: Smooth the learning curve (window size 20-50 episodes)
3. **Heat map**: Show where the agent spends most time
4. **Rule network**: Show which rules chain together
5. **Strength histogram**: Distribution of rule strengths

#### Analyzing the Learned Behavior
Observe the emergent strategies:
- **Path following**: Does the agent learn a specific path?
- **Obstacle avoidance**: How does it handle rocks?
- **Goal-directed behavior**: Does it move directly toward food or search?
- **Reaction time**: How quickly does it respond to new perceptions?

#### The "Default Hierarchy" in Action
Identify the hierarchy:
- **Highest level**: Rules with many wildcards (e.g., [#, #, #, #, #, #, #, #, -1] -> FORWARD)
- **Middle level**: Rules with some specifics (e.g., [0, #, #, #, 1, #, #, #, -1] -> TURN_LEFT)
- **Lowest level**: Very specific rules (e.g., [0, 0, 0, 0, 1, 1, 0, 0, -1] -> TURN_RIGHT)

### Test Your Understanding
Final integration questions:
- How does the system handle novel situations not in its initial training?
- What happens if we change the environment (move rocks or food)?
- Can this system generalize to other grid worlds?

### What Your Code Should Do at the End of Stage 8
Your final code should produce:
```
Learning Curve Analysis:
  Initial average (episodes 1-50): 42.3 steps
  Mid training (episodes 200-250): 8.1 steps
  Final performance (episodes 450-500): 5.3 steps

Rule Population Analysis:
  Total classifiers: 623
  Strong rules (strength > 100): 47
  Weak rules (strength < 10): 189
  Average wildcards per rule: 4.2

Top 5 Rules:
  1. [0, 0, #, #, #, #, #, #, -1] -> FORWARD (strength 342.1)
  2. [0, #, #, #, 1, #, #, #, -1] -> TURN_LEFT (strength 287.4)
  3. [#, #, #, #, #, #, #, #, -1] -> FORWARD (strength 256.3)
  4. [0, 0, 0, #, #, #, #, #, -1] -> FORWARD (strength 198.7)
  5. [0, #, #, #, #, #, #, #, -1] -> TURN_RIGHT (strength 176.2)

Emergent Strategy:
  The agent has learned to:
  1. Move forward when no obstacles detected (Rule 1)
  2. Turn left when a rock is on the right (Rule 2)
  3. Always prefer forward movement when uncertain (Rule 3)
  4. Follow the right wall when in open space (Rule 4)
  5. Turn right when a rock is on the left (Rule 5)
  
Visualization saved: learning_curve.png, rule_distribution.png, path_heatmap.png
```
This shows a fully functioning Bucket Brigade classifier system that has learned the forest navigation task.

---

## Course Summary: Key Takeaways

### What You've Built
1. **Grid World Environment**: A 2D simulation with obstacles and rewards
2. **Classifier System**: Rule-based decision making with bidding and competition
3. **Bucket Brigade Algorithm**: Backward credit assignment for delayed rewards
4. **Genetic Algorithm**: Rule discovery and population evolution
5. **Complete Learning System**: From random wandering to optimal navigation

### Core Principles You've Mastered
- **Credit Assignment**: How to assign credit to early decisions when reward is delayed
- **Reinforcement Learning**: Learning from sparse rewards through backward propagation
- **Rule Competition**: Economic market model for action selection
- **Emergent Behavior**: Complex strategies arising from simple local interactions
- **Evolutionary Adaptation**: Using genetic algorithms to discover new solutions

### The Magic of the Bucket Brigade
What makes this algorithm remarkable:
- **No explicit planning**: The agent learns through trial and error
- **Distributed knowledge**: No single "brain" - knowledge is in the rule population
- **Self-organizing hierarchy**: Rules naturally organize into levels of abstraction
- **Robustness**: Even with simple rules, complex behaviors emerge

### Next Steps and Extensions
After completing this implementation, consider:
- Adding **continuous action spaces** (e.g., variable speed)
- Implementing **multi-agent systems** (multiple creatures competing for food)
- Adding **negative rewards** (predators) to create more complex environments
- **Transfer learning**: Train on one grid, test on another
- **Higher-level reasoning**: Add an explicit planning layer above the classifier system

---

## Your Implementation Plan

### Suggested Development Order

1. **Week 1**: Stages 1-3
   - Focus on getting the environment and basic rule structure right
   - Test extensively with manual rule input
   - Ensure your perception system is accurate

2. **Week 2**: Stages 4-5
   - This is the heart of the system
   - Implement the Bucket Brigade carefully
   - Test with simple reward scenarios before full training

3. **Week 3**: Stage 6-7
   - Add the GA and full training loop
   - Expect bugs in the first few runs
   - Monitor performance metrics closely

4. **Week 4**: Stage 8
   - Add visualization and analysis
   - Fine-tune parameters
   - Document emergent behaviors

### Critical Parameters to Tune

| Parameter | Typical Value | Impact |
|-----------|--------------|--------|
| `bid_ratio` | 0.1 | Higher → more exploration, lower → more exploitation |
| `tax_rate` | 0.02 | Higher → faster forgetting, lower → more stable |
| `discount_factor` | 0.5 | Higher → earlier rules get more credit |
| `GA_interval` | 25 | How often to evolve |
| `crossover_rate` | 0.7 | GA recombination frequency |
| `mutation_rate` | 0.01 | GA exploration |
| `population_size` | 400-800 | System capacity |
| `max_steps` | 200 | Episode timeout |
| `reward_food` | 1000 | Positive reward strength |
| `penalty_rock` | -5 | Negative reinforcement |

### Debugging Tips

1. **Start Simple**: Test with 1 rock, then add more
2. **Manual Steps**: Run single steps and inspect the match set
3. **Log Everything**: Track strengths, bids, and rewards
4. **Visualize Early**: Even simple ASCII maps help
5. **Parameter Sweeps**: Test with different bid_ratio and tax_rate values

### Common Pitfalls to Avoid

- **Population Implosion**: All classifiers become too similar → lower mutation rate
- **Rule Over-specialization**: Too many specific rules → increase tax rate or GA frequency
- **Exploration Collapse**: Agent stops trying new things → increase epsilon
- **Credit Propagation Failure**: Rewards not reaching early rules → check chain management
- **GA Destroying Good Rules**: Weak elitism → increase elitism rate

---
