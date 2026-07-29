/* =====================================================================
   School Wits — Bundled sample paper
   Cambridge O Level Physics 5054/21, May/June 2025 (Paper 1, Variant 1)
   Loaded into IndexedDB once on first run so the app has something to
   browse, search and build a module from out of the box.
   ===================================================================== */

const SAMPLE_PAPER_META = {
  "subject": "Physics",
  "subjectCode": "5054",
  "paper": "1",
  "variant": "1",
  "session": "M/J",
  "year": "2025",
  "syllabusLabel": "5054/21/M/J/25"
};

const SAMPLE_QUESTIONS = [
  {
    "id": 1,
    "topic": "Forces & Motion",
    "ref": "5054/21/M/J/25 — Q1",
    "marks": 9,
    "qText": "Fig. 1.1 shows a skydiver falling vertically through the air. Fig. 1.1 In the first part of the fall, her speed increases and her acceleration decreases. In the second part of the fall, her speed is constant. (a) On Fig. 1.2 sketch the speed&ndash;time graph for the skydiver. On your graph, mark one point where the speed of the skydiver is increasing with an A and one point where the speed of the skydiver is constant with a B . Fig. 1.2 2 (b) Explain how the graph shows that the acceleration decreases as the speed increases. 1 (c) During the first part of the fall, there is a resultant vertical force acting downwards on the skydiver. (i) One of the vertical forces acting on the skydiver is her weight. State the name of the other vertical force that acts on the skydiver. 1 (ii) Explain why the resultant vertical force eventually becomes zero. 2 (d) At one instant, the vertical force on the skydiver is 400&nbsp;N downwards. At the same instant, the wind causes an additional horizontal force of 100&nbsp;N to the right to act on the skydiver. Draw a vector diagram to determine the resultant of the 400&nbsp;N vertical force and the 100&nbsp;N horizontal force. Place an arrow on all of the forces to show their directions. Determine the magnitude (size) of this resultant force and its direction to the vertical. 3",
    "qHTML": "\n    <p>Fig. 1.1 shows a skydiver falling vertically through the air.</p>\n    <figure class=\"qfig\">\n      <img src=\"assets/img/q1-fig1.png\" alt=\"Fig. 1.1 skydiver falling\">\n      <figcaption>Fig. 1.1</figcaption>\n    </figure>\n    <p>In the first part of the fall, her speed increases and her acceleration decreases.<br>\n    In the second part of the fall, her speed is constant.</p>\n\n    <div class=\"qpart\">\n      <span class=\"pmark\">(a)</span>\n      <div>\n        <p>On Fig. 1.2 sketch the speed&ndash;time graph for the skydiver. On your graph, mark one point where the speed of the skydiver is increasing with an <b>A</b> and one point where the speed of the skydiver is constant with a <b>B</b>.</p>\n        <figure class=\"qfig qfig--sm\">\n          <img src=\"assets/img/q1-fig2.png\" alt=\"Fig. 1.2 blank speed-time axes\">\n          <figcaption>Fig. 1.2</figcaption>\n        </figure>\n        <span class=\"marktag\">2</span>\n      </div>\n    </div>\n\n    <div class=\"qpart\">\n      <span class=\"pmark\">(b)</span>\n      <div><p>Explain how the graph shows that the acceleration decreases as the speed increases.</p><span class=\"marktag\">1</span></div>\n    </div>\n\n    <div class=\"qpart\">\n      <span class=\"pmark\">(c)</span>\n      <div>\n        <p>During the first part of the fall, there is a resultant vertical force acting downwards on the skydiver.</p>\n        <div class=\"qpart qpart--roman\">\n          <span class=\"pmark\">(i)</span>\n          <div><p>One of the vertical forces acting on the skydiver is her weight. State the name of the other vertical force that acts on the skydiver.</p><span class=\"marktag\">1</span></div>\n        </div>\n        <div class=\"qpart qpart--roman\">\n          <span class=\"pmark\">(ii)</span>\n          <div><p>Explain why the resultant vertical force eventually becomes zero.</p><span class=\"marktag\">2</span></div>\n        </div>\n      </div>\n    </div>\n\n    <div class=\"qpart\">\n      <span class=\"pmark\">(d)</span>\n      <div>\n        <p>At one instant, the vertical force on the skydiver is 400&nbsp;N downwards. At the same instant, the wind causes an additional horizontal force of 100&nbsp;N to the right to act on the skydiver. Draw a vector diagram to determine the resultant of the 400&nbsp;N vertical force and the 100&nbsp;N horizontal force. Place an arrow on all of the forces to show their directions. Determine the magnitude (size) of this resultant force and its direction to the vertical.</p>\n        <span class=\"marktag\">3</span>\n      </div>\n    </div>\n  ",
    "markScheme": [
      {
        "part": "1(a)",
        "answer": "Curve upwards (at start) with decreasing gradient, labelled A",
        "marks": "B1"
      },
      {
        "part": "",
        "answer": "Horizontal line labelled B",
        "marks": "B1"
      },
      {
        "part": "1(b)",
        "answer": "Gradient / slope decreases &mdash; equal increases in speed take longer at later times",
        "marks": "B1"
      },
      {
        "part": "1(c)(i)",
        "answer": "Air resistance / drag",
        "marks": "B1"
      },
      {
        "part": "1(c)(ii)",
        "answer": "Air resistance / upwards force increases with increased speed",
        "marks": "B1"
      },
      {
        "part": "",
        "answer": "Air resistance / upwards force equals (balances) weight",
        "marks": "B1"
      },
      {
        "part": "1(d)",
        "answer": "Vector diagram showing 400 N and 100 N at right angles, correct resultant, all directions shown",
        "marks": "B1"
      },
      {
        "part": "",
        "answer": "410 (N)",
        "marks": "B1"
      },
      {
        "part": "",
        "answer": "12&ndash;16&deg;",
        "marks": "B1"
      }
    ],
    "exemplarHTML": "\n    <h4>(a) Speed&ndash;time graph</h4>\n    <p>Draw a curve starting at the origin, rising steeply and then bending over with a steadily decreasing gradient, finally levelling into a horizontal straight line. Mark <b>A</b> on the rising curved part (speed still increasing) and <b>B</b> on the flat part (constant / terminal speed).</p>\n    <h4>(b) Why the graph shows decreasing acceleration</h4>\n    <p>The gradient of a speed&ndash;time graph equals the acceleration. As time (and speed) increase, the curve becomes less steep, so its gradient decreases &mdash; therefore the acceleration decreases as the speed increases.</p>\n    <h4>(c)(i) The other vertical force</h4>\n    <p>Air resistance (drag).</p>\n    <h4>(c)(ii) Why the resultant vertical force becomes zero</h4>\n    <p>As the skydiver speeds up, the air resistance acting upwards increases. Eventually the air resistance grows until it equals (balances) her weight. With the upward and downward forces equal, there is no resultant vertical force.</p>\n    <h4>(d) Resultant of the 400 N and 100 N forces</h4>\n    <p>Draw the 400&nbsp;N force vertically downward and the 100&nbsp;N force horizontally to the right, joined tip-to-tail at right angles, each with an arrow; the resultant runs from the start of the first to the end of the second.</p>\n    <div class=\"mathblock\">\\[ R = \\sqrt{400^{2} + 100^{2}} = \\sqrt{170000} = \\boxed{410\\ \\text{N}} \\]</div>\n    <div class=\"mathblock\">\\[ \\tan\\theta = \\frac{100}{400} \\quad\\Rightarrow\\quad \\theta = \\boxed{14^{\\circ}\\ \\text{to the vertical}} \\]</div>\n  ",
    "videoId": ""
  },
  {
    "id": 2,
    "topic": "Turning Effects of Forces",
    "ref": "5054/21/M/J/25 — Q2",
    "marks": 8,
    "qText": "(a) State the principle of moments. 2 (b) An airline passenger wishes to check the weight of a suitcase that he carries as hand luggage onto an aeroplane. He uses a uniform plank of wood, pivoted at its centre, as shown in Fig. 2.1. Fig. 2.1 The plank is balanced with the suitcase on one side of the pivot and three bags of sugar, each of mass 2.0&nbsp;kg, on the other side. The distances are shown on Fig. 2.1. (i) Calculate the weight of one bag of sugar. 1 (ii) The maximum weight of a suitcase that can be carried onto the aeroplane is 67&nbsp;N. Determine whether the weight of the suitcase exceeds the maximum allowed. Show a calculation in your answer. 2 (c) A tall bus is tested for stability. Fig. 2.2 shows the bus on a slope. The centre of gravity of the bus is marked. Fig. 2.2 (i) State what is meant by the &lsquo;centre of gravity&rsquo; of an object. 1 (ii) When the slope is made very steep, the bus falls over by rotating about point P. Explain why the bus falls over. 2",
    "qHTML": "\n    <div class=\"qpart\">\n      <span class=\"pmark\">(a)</span>\n      <div><p>State the principle of moments.</p><span class=\"marktag\">2</span></div>\n    </div>\n\n    <div class=\"qpart\">\n      <span class=\"pmark\">(b)</span>\n      <div>\n        <p>An airline passenger wishes to check the weight of a suitcase that he carries as hand luggage onto an aeroplane. He uses a uniform plank of wood, pivoted at its centre, as shown in Fig. 2.1.</p>\n        <figure class=\"qfig\">\n          <img src=\"assets/img/q2-fig1.png\" alt=\"Fig. 2.1 pivoted plank with suitcase and sugar bags\">\n          <figcaption>Fig. 2.1</figcaption>\n        </figure>\n        <p>The plank is balanced with the suitcase on one side of the pivot and three bags of sugar, each of mass 2.0&nbsp;kg, on the other side. The distances are shown on Fig. 2.1.</p>\n        <div class=\"qpart qpart--roman\">\n          <span class=\"pmark\">(i)</span>\n          <div><p>Calculate the weight of one bag of sugar.</p><span class=\"marktag\">1</span></div>\n        </div>\n        <div class=\"qpart qpart--roman\">\n          <span class=\"pmark\">(ii)</span>\n          <div><p>The maximum weight of a suitcase that can be carried onto the aeroplane is 67&nbsp;N. Determine whether the weight of the suitcase exceeds the maximum allowed. Show a calculation in your answer.</p><span class=\"marktag\">2</span></div>\n        </div>\n      </div>\n    </div>\n\n    <div class=\"qpart\">\n      <span class=\"pmark\">(c)</span>\n      <div>\n        <p>A tall bus is tested for stability. Fig. 2.2 shows the bus on a slope. The centre of gravity of the bus is marked.</p>\n        <figure class=\"qfig qfig--sm\">\n          <img src=\"assets/img/q2-fig2.png\" alt=\"Fig. 2.2 bus on a slope about to topple about point P\">\n          <figcaption>Fig. 2.2</figcaption>\n        </figure>\n        <div class=\"qpart qpart--roman\">\n          <span class=\"pmark\">(i)</span>\n          <div><p>State what is meant by the &lsquo;centre of gravity&rsquo; of an object.</p><span class=\"marktag\">1</span></div>\n        </div>\n        <div class=\"qpart qpart--roman\">\n          <span class=\"pmark\">(ii)</span>\n          <div><p>When the slope is made very steep, the bus falls over by rotating about point P. Explain why the bus falls over.</p><span class=\"marktag\">2</span></div>\n        </div>\n      </div>\n    </div>\n  ",
    "markScheme": [
      {
        "part": "2(a)",
        "answer": "(Total) clockwise moments = anticlockwise moments",
        "marks": "M1"
      },
      {
        "part": "",
        "answer": "&hellip; when a body is in equilibrium",
        "marks": "A1"
      },
      {
        "part": "2(b)(i)",
        "answer": "19.6 or 20 N",
        "marks": "B1"
      },
      {
        "part": "2(b)(ii)",
        "answer": "80 &times; 3 &times; (b)(i) = 90 &times; weight",
        "marks": "B1"
      },
      {
        "part": "",
        "answer": "52 (N) — weight of suitcase does not exceed the maximum",
        "marks": "B1"
      },
      {
        "part": "2(c)(i)",
        "answer": "(Place) where the weight of an object can be taken to act",
        "marks": "B1"
      },
      {
        "part": "2(c)(ii)",
        "answer": "Centre of gravity falls outside the base / to the left of P",
        "marks": "B1"
      },
      {
        "part": "",
        "answer": "Weight causes an anticlockwise moment / turning effect",
        "marks": "B1"
      }
    ],
    "exemplarHTML": "\n    <h4>(a) Principle of moments</h4>\n    <p>For a body in equilibrium, the sum of the clockwise moments about any point equals the sum of the anticlockwise moments about that same point.</p>\n    <h4>(b)(i) Weight of one bag of sugar</h4>\n    <div class=\"mathblock\">\\[ W = mg = 2.0 \\times 9.8 = \\boxed{19.6\\ \\text{N}} \\]</div>\n    <h4>(b)(ii) Does the suitcase exceed the 67 N limit?</h4>\n    <p>Taking moments about the pivot, the three bags of sugar at 80&nbsp;cm balance the suitcase at 90&nbsp;cm:</p>\n    <div class=\"mathblock\">\\[ (80)(3)(19.6) = (90)(W) \\]</div>\n    <div class=\"mathblock\">\\[ W = \\frac{80 \\times 3 \\times 19.6}{90} = \\boxed{52\\ \\text{N}} \\]</div>\n    <p>Since 52&nbsp;N is less than 67&nbsp;N, the weight of the suitcase does not exceed the maximum allowed.</p>\n    <h4>(c)(i) Centre of gravity</h4>\n    <p>The point at which the whole weight of an object can be taken to act.</p>\n    <h4>(c)(ii) Why the bus falls over</h4>\n    <p>When the slope is steep enough, the centre of gravity moves outside the base of the bus, to the left of point P. The weight of the bus then acts outside P, producing an anticlockwise moment (turning effect) about P, so the bus rotates and topples over.</p>\n  ",
    "videoId": ""
  },
  {
    "id": 3,
    "topic": "Work, Energy & Power",
    "ref": "5054/21/M/J/25 — Q3",
    "marks": 8,
    "qText": "A battery, a pulley and a motor are used to lift a load as shown in Fig. 3.1. Fig. 3.1 (a) Describe the transfers between energy stores that occur as the load is lifted. 3 (b) The efficiency of the motor, pulley and load system is less than 100%. (i) By comparing the input energy and the useful output energy, explain why the efficiency is less than 100%. 1 (ii) Explain how the principle of conservation of energy applies in lifting the load. 2 (c) The input power to the motor is 15&nbsp;W. The motor is used for 20&nbsp;s. The efficiency of the motor is 60%. Calculate the energy supplied to the load. 2",
    "qHTML": "\n    <p>A battery, a pulley and a motor are used to lift a load as shown in Fig. 3.1.</p>\n    <figure class=\"qfig qfig--sm\">\n      <img src=\"assets/img/q3-fig1.png\" alt=\"Fig. 3.1 battery, motor and pulley lifting a load\">\n      <figcaption>Fig. 3.1</figcaption>\n    </figure>\n\n    <div class=\"qpart\">\n      <span class=\"pmark\">(a)</span>\n      <div><p>Describe the transfers between energy stores that occur as the load is lifted.</p><span class=\"marktag\">3</span></div>\n    </div>\n\n    <div class=\"qpart\">\n      <span class=\"pmark\">(b)</span>\n      <div>\n        <p>The efficiency of the motor, pulley and load system is less than 100%.</p>\n        <div class=\"qpart qpart--roman\">\n          <span class=\"pmark\">(i)</span>\n          <div><p>By comparing the input energy and the useful output energy, explain why the efficiency is less than 100%.</p><span class=\"marktag\">1</span></div>\n        </div>\n        <div class=\"qpart qpart--roman\">\n          <span class=\"pmark\">(ii)</span>\n          <div><p>Explain how the principle of conservation of energy applies in lifting the load.</p><span class=\"marktag\">2</span></div>\n        </div>\n      </div>\n    </div>\n\n    <div class=\"qpart\">\n      <span class=\"pmark\">(c)</span>\n      <div><p>The input power to the motor is 15&nbsp;W. The motor is used for 20&nbsp;s. The efficiency of the motor is 60%. Calculate the energy supplied to the load.</p><span class=\"marktag\">2</span></div>\n    </div>\n  ",
    "markScheme": [
      {
        "part": "3(a)",
        "answer": "Any three: reduction in chemical energy store in battery; electrical work done by motor; mechanical work done on weight; increase in gravitational energy store of weight; increase in thermal energy (motor / air); electrical heating (by current)",
        "marks": "B3"
      },
      {
        "part": "3(b)(i)",
        "answer": "Useful (output) energy &lt; input energy",
        "marks": "B1"
      },
      {
        "part": "3(b)(ii)",
        "answer": "Total energy is constant",
        "marks": "B1"
      },
      {
        "part": "",
        "answer": "Energy from power supply = energy gained by weight + thermal energy (to air / friction)",
        "marks": "B1"
      },
      {
        "part": "3(c)",
        "answer": "(E =) power &times; time, in any form",
        "marks": "C1"
      },
      {
        "part": "",
        "answer": "180 J",
        "marks": "A1"
      }
    ],
    "exemplarHTML": "\n    <h4>(a) Energy transfers as the load is lifted</h4>\n    <p>The chemical energy store in the battery decreases; the motor does electrical work; mechanical work is done raising the load, so the gravitational potential energy store of the load increases; and some energy is transferred to thermal energy stores (in the motor and surrounding air) through electrical heating and friction. (any three)</p>\n    <h4>(b)(i) Why the efficiency is less than 100%</h4>\n    <p>The useful output energy (gravitational potential energy gained by the load) is less than the input energy supplied, because some of the input energy is wasted as thermal energy.</p>\n    <h4>(b)(ii) Conservation of energy</h4>\n    <p>The total energy stays constant &mdash; energy is only transferred, never created or destroyed. Here, the energy supplied by the power supply equals the energy gained by the weight plus the thermal energy transferred to the surroundings.</p>\n    <h4>(c) Energy supplied to the load</h4>\n    <div class=\"mathblock\">\\[ E = \\text{efficiency} \\times \\text{input energy} = 0.60 \\times (15 \\times 20) = \\boxed{180\\ \\text{J}} \\]</div>\n  ",
    "videoId": ""
  },
  {
    "id": 4,
    "topic": "Thermal Physics",
    "ref": "5054/21/M/J/25 — Q4",
    "marks": 7,
    "qText": "(a) Evaporation of water from the surface of the skin causes cooling. (i) Describe, using ideas about particles, how evaporation causes cooling. 2 (ii) State one difference between evaporation and boiling. 1 (b) When a refrigerator is switched on, cooling coils placed at the top of the space inside the refrigerator become cold. This causes a convection current which cools the air inside the refrigerator. The refrigerator is shown in Fig. 4.1. Fig. 4.1 (i) Explain how the cooling coils cause a convection current in the air inside the refrigerator. 2 (ii) The food in the refrigerator is initially at a temperature of 20.0&deg;C. The food has a mass of 3.6&nbsp;kg and a specific heat capacity of 3000&nbsp;J/(kg&deg;C). Calculate the final temperature of the food after 160000&nbsp;J of thermal energy is removed from it. 2",
    "qHTML": "\n    <div class=\"qpart\">\n      <span class=\"pmark\">(a)</span>\n      <div>\n        <p>Evaporation of water from the surface of the skin causes cooling.</p>\n        <div class=\"qpart qpart--roman\">\n          <span class=\"pmark\">(i)</span>\n          <div><p>Describe, using ideas about particles, how evaporation causes cooling.</p><span class=\"marktag\">2</span></div>\n        </div>\n        <div class=\"qpart qpart--roman\">\n          <span class=\"pmark\">(ii)</span>\n          <div><p>State one difference between evaporation and boiling.</p><span class=\"marktag\">1</span></div>\n        </div>\n      </div>\n    </div>\n\n    <div class=\"qpart\">\n      <span class=\"pmark\">(b)</span>\n      <div>\n        <p>When a refrigerator is switched on, cooling coils placed at the top of the space inside the refrigerator become cold. This causes a convection current which cools the air inside the refrigerator. The refrigerator is shown in Fig. 4.1.</p>\n        <figure class=\"qfig qfig--sm\">\n          <img src=\"assets/img/q4-fig1.png\" alt=\"Fig. 4.1 refrigerator with cooling coils at top\">\n          <figcaption>Fig. 4.1</figcaption>\n        </figure>\n        <div class=\"qpart qpart--roman\">\n          <span class=\"pmark\">(i)</span>\n          <div><p>Explain how the cooling coils cause a convection current in the air inside the refrigerator.</p><span class=\"marktag\">2</span></div>\n        </div>\n        <div class=\"qpart qpart--roman\">\n          <span class=\"pmark\">(ii)</span>\n          <div><p>The food in the refrigerator is initially at a temperature of 20.0&deg;C. The food has a mass of 3.6&nbsp;kg and a specific heat capacity of 3000&nbsp;J/(kg&deg;C). Calculate the final temperature of the food after 160000&nbsp;J of thermal energy is removed from it.</p><span class=\"marktag\">2</span></div>\n        </div>\n      </div>\n    </div>\n  ",
    "markScheme": [
      {
        "part": "4(a)(i)",
        "answer": "Faster particles escape (from water on skin)",
        "marks": "B1"
      },
      {
        "part": "",
        "answer": "Leaving behind slower particles",
        "marks": "B1"
      },
      {
        "part": "4(a)(ii)",
        "answer": "Any one: evaporation occurs at the surface; boiling is at one fixed temperature; boiling involves bubble formation; boiling occurs throughout the liquid",
        "marks": "B1"
      },
      {
        "part": "4(b)(i)",
        "answer": "Cold air sinks",
        "marks": "B1"
      },
      {
        "part": "",
        "answer": "Cold air is denser than hot air",
        "marks": "B1"
      },
      {
        "part": "4(b)(ii)",
        "answer": "(T&#8323; = T&#8305; &minus;) E/mc in any form, or 14.8 seen",
        "marks": "C1"
      },
      {
        "part": "",
        "answer": "5.2 (&deg;C)",
        "marks": "A1"
      }
    ],
    "exemplarHTML": "\n    <h4>(a)(i) How evaporation causes cooling</h4>\n    <p>The faster-moving particles have enough energy to escape from the surface of the water. This leaves behind the slower-moving particles, so the average kinetic energy of the remaining liquid falls, meaning its temperature falls and it cools.</p>\n    <h4>(a)(ii) One difference between evaporation and boiling</h4>\n    <p>Evaporation happens only at the surface of the liquid (at any temperature), whereas boiling happens throughout the liquid at one fixed temperature, with bubbles forming inside it.</p>\n    <h4>(b)(i) How the cooling coils cause a convection current</h4>\n    <p>Air next to the cold coils is cooled and becomes denser than the surrounding warmer air, so it sinks. Warmer, less dense air rises to take its place and is cooled in turn, setting up a continuous convection current.</p>\n    <h4>(b)(ii) Final temperature of the food</h4>\n    <div class=\"mathblock\">\\[ \\Delta\\theta = \\frac{E}{mc} = \\frac{160000}{3.6 \\times 3000} = 14.8\\ ^{\\circ}\\text{C} \\]</div>\n    <div class=\"mathblock\">\\[ T_f = 20.0 - 14.8 = \\boxed{5.2\\ ^{\\circ}\\text{C}} \\]</div>\n  ",
    "videoId": ""
  },
  {
    "id": 5,
    "topic": "Waves",
    "ref": "5054/21/M/J/25 — Q5",
    "marks": 8,
    "qText": "(a) Fig. 5.1 is a diagram showing the arrangement of air particles as a longitudinal wave passes through them. Fig. 5.1 (i) On Fig. 5.1, mark the centre of a compression with the letter C , and mark the centre of a rarefaction with the letter R . 1 (ii) Describe the difference between a compression and a rarefaction. 1 (b) In a ripple tank, a water wave is produced by a wooden bar moving up and down on the surface of water. (i) The wooden bar makes 45 complete oscillations in 1.0 minute. Calculate the frequency of the wave produced. 1 (ii) The frequency of the water wave is increased by moving the wooden bar up and down more quickly. State what happens to the speed and what happens to the wavelength of the wave produced. 2 (iii) The crests of the water wave move into the shallow region shown in Fig. 5.2. Fig. 5.2 On Fig. 5.2, draw the crests in the shallow region. 2 (c) Describe what is meant by the diffraction of a water wave. 1",
    "qHTML": "\n    <div class=\"qpart\">\n      <span class=\"pmark\">(a)</span>\n      <div>\n        <p>Fig. 5.1 is a diagram showing the arrangement of air particles as a longitudinal wave passes through them.</p>\n        <figure class=\"qfig\">\n          <img src=\"assets/img/q5-fig1.png\" alt=\"Fig. 5.1 air particles in a longitudinal wave\">\n          <figcaption>Fig. 5.1</figcaption>\n        </figure>\n        <div class=\"qpart qpart--roman\">\n          <span class=\"pmark\">(i)</span>\n          <div><p>On Fig. 5.1, mark the centre of a compression with the letter <b>C</b>, and mark the centre of a rarefaction with the letter <b>R</b>.</p><span class=\"marktag\">1</span></div>\n        </div>\n        <div class=\"qpart qpart--roman\">\n          <span class=\"pmark\">(ii)</span>\n          <div><p>Describe the difference between a compression and a rarefaction.</p><span class=\"marktag\">1</span></div>\n        </div>\n      </div>\n    </div>\n\n    <div class=\"qpart\">\n      <span class=\"pmark\">(b)</span>\n      <div>\n        <p>In a ripple tank, a water wave is produced by a wooden bar moving up and down on the surface of water.</p>\n        <div class=\"qpart qpart--roman\">\n          <span class=\"pmark\">(i)</span>\n          <div><p>The wooden bar makes 45 complete oscillations in 1.0 minute. Calculate the frequency of the wave produced.</p><span class=\"marktag\">1</span></div>\n        </div>\n        <div class=\"qpart qpart--roman\">\n          <span class=\"pmark\">(ii)</span>\n          <div><p>The frequency of the water wave is increased by moving the wooden bar up and down more quickly. State what happens to the speed and what happens to the wavelength of the wave produced.</p><span class=\"marktag\">2</span></div>\n        </div>\n        <div class=\"qpart qpart--roman\">\n          <span class=\"pmark\">(iii)</span>\n          <div>\n            <p>The crests of the water wave move into the shallow region shown in Fig. 5.2.</p>\n            <figure class=\"qfig qfig--sm\">\n              <img src=\"assets/img/q5-fig2.png\" alt=\"Fig. 5.2 crests approaching a shallow region\">\n              <figcaption>Fig. 5.2</figcaption>\n            </figure>\n            <p>On Fig. 5.2, draw the crests in the shallow region.</p>\n            <span class=\"marktag\">2</span>\n          </div>\n        </div>\n      </div>\n    </div>\n\n    <div class=\"qpart\">\n      <span class=\"pmark\">(c)</span>\n      <div><p>Describe what is meant by the diffraction of a water wave.</p><span class=\"marktag\">1</span></div>\n    </div>\n  ",
    "markScheme": [
      {
        "part": "5(a)(i)",
        "answer": "C and R marked correctly",
        "marks": "B1"
      },
      {
        "part": "5(a)(ii)",
        "answer": "Compressions are where pressure is high / particles close together / density is high",
        "marks": "B1"
      },
      {
        "part": "5(b)(i)",
        "answer": "0.75 (Hz)",
        "marks": "B1"
      },
      {
        "part": "5(b)(ii)",
        "answer": "Speed: no change",
        "marks": "B1"
      },
      {
        "part": "",
        "answer": "Wavelength: decreases",
        "marks": "B1"
      },
      {
        "part": "5(b)(iii)",
        "answer": "At least 3 wavefronts in the shallow region, parallel, on the correct side of the normal",
        "marks": "M1"
      },
      {
        "part": "",
        "answer": "Refracted towards the normal, correct side, wavefronts joined",
        "marks": "A1"
      },
      {
        "part": "5(c)",
        "answer": "Spreading out / bending at an edge or obstacle, or after passing through a gap",
        "marks": "B1"
      }
    ],
    "exemplarHTML": "\n    <h4>(a)(i) Marking C and R</h4>\n    <p>Mark <b>C</b> at the centre of a region where the dots (particles) are bunched closest together (a compression), and mark <b>R</b> at the centre of a region where the dots are most spread out (a rarefaction).</p>\n    <h4>(a)(ii) Compression versus rarefaction</h4>\n    <p>A compression is a region where particles are close together and pressure (and density) is high; a rarefaction is a region where particles are spread apart and pressure (and density) is low.</p>\n    <h4>(b)(i) Frequency of the wave</h4>\n    <div class=\"mathblock\">\\[ f = \\frac{\\text{oscillations}}{\\text{time}} = \\frac{45}{60} = \\boxed{0.75\\ \\text{Hz}} \\]</div>\n    <h4>(b)(ii) Effect of increasing the frequency</h4>\n    <p><b>Speed:</b> no change (speed depends on the water depth, not frequency). <b>Wavelength:</b> decreases &mdash; since v&nbsp;=&nbsp;f&lambda; and v is constant, a higher frequency gives a shorter wavelength.</p>\n    <h4>(b)(iii) Crests in the shallow region</h4>\n    <p>In the shallow region the wave travels more slowly, so the crests become closer together and change direction. Draw at least three crests, parallel to one another and more closely spaced than the incoming ones, refracted so they join up correctly with the incoming crests.</p>\n    <h4>(c) Diffraction of a water wave</h4>\n    <p>Diffraction is the spreading out (and bending) of a wave as it passes the edge of an obstacle, or as it passes through a gap.</p>\n  ",
    "videoId": ""
  },
  {
    "id": 6,
    "topic": "Electricity",
    "ref": "5054/21/M/J/25 — Q6",
    "marks": 10,
    "qText": "A student sets up a circuit to determine the resistance of a length of wire. The circuit contains a battery of unknown e.m.f., a length of wire used to make a resistor X, an ammeter, a voltmeter and a variable resistor R. (a) Fig. 6.1 shows part of the circuit diagram. Fig. 6.1 (i) On Fig. 6.1, complete the circuit diagram by adding one voltmeter and one ammeter in suitable places to allow the determination of the resistance of X. 1 (ii) Explain how X and R act as a variable potential divider. 2 (b) The student determines the resistance of resistor X for five different lengths of the wire making it. The lengths of wire range from 20&nbsp;cm to 60&nbsp;cm. The type of wire and the cross-sectional area of the wire are kept constant. Fig. 6.2 shows a graph of the results. Fig. 6.2 (i) State the relationship between the resistance of the wire and the length of the wire. 1 (ii) Calculate the current in a 90&nbsp;cm length of the wire when there is a potential difference (p.d.) of 9.0&nbsp;V across it. Show your working. 3 (iii) The p.d. across the wire making resistor X is kept constant for all the measurements of resistance. Describe the relationship between the current in the wire and the length of the wire. 2 (c) State how the resistance of a wire depends upon the cross-sectional area of the wire. 1",
    "qHTML": "\n    <p>A student sets up a circuit to determine the resistance of a length of wire. The circuit contains a battery of unknown e.m.f., a length of wire used to make a resistor X, an ammeter, a voltmeter and a variable resistor R.</p>\n\n    <div class=\"qpart\">\n      <span class=\"pmark\">(a)</span>\n      <div>\n        <p>Fig. 6.1 shows part of the circuit diagram.</p>\n        <figure class=\"qfig qfig--sm\">\n          <img src=\"assets/img/q6-fig1.png\" alt=\"Fig. 6.1 partial circuit diagram with X and R\">\n          <figcaption>Fig. 6.1</figcaption>\n        </figure>\n        <div class=\"qpart qpart--roman\">\n          <span class=\"pmark\">(i)</span>\n          <div><p>On Fig. 6.1, complete the circuit diagram by adding one voltmeter and one ammeter in suitable places to allow the determination of the resistance of X.</p><span class=\"marktag\">1</span></div>\n        </div>\n        <div class=\"qpart qpart--roman\">\n          <span class=\"pmark\">(ii)</span>\n          <div><p>Explain how X and R act as a variable potential divider.</p><span class=\"marktag\">2</span></div>\n        </div>\n      </div>\n    </div>\n\n    <div class=\"qpart\">\n      <span class=\"pmark\">(b)</span>\n      <div>\n        <p>The student determines the resistance of resistor X for five different lengths of the wire making it. The lengths of wire range from 20&nbsp;cm to 60&nbsp;cm. The type of wire and the cross-sectional area of the wire are kept constant. Fig. 6.2 shows a graph of the results.</p>\n        <figure class=\"qfig\">\n          <img src=\"assets/img/q6-fig2.png\" alt=\"Fig. 6.2 graph of resistance against length of wire\">\n          <figcaption>Fig. 6.2</figcaption>\n        </figure>\n        <div class=\"qpart qpart--roman\">\n          <span class=\"pmark\">(i)</span>\n          <div><p>State the relationship between the resistance of the wire and the length of the wire.</p><span class=\"marktag\">1</span></div>\n        </div>\n        <div class=\"qpart qpart--roman\">\n          <span class=\"pmark\">(ii)</span>\n          <div><p>Calculate the current in a 90&nbsp;cm length of the wire when there is a potential difference (p.d.) of 9.0&nbsp;V across it. Show your working.</p><span class=\"marktag\">3</span></div>\n        </div>\n        <div class=\"qpart qpart--roman\">\n          <span class=\"pmark\">(iii)</span>\n          <div><p>The p.d. across the wire making resistor X is kept constant for all the measurements of resistance. Describe the relationship between the current in the wire and the length of the wire.</p><span class=\"marktag\">2</span></div>\n        </div>\n      </div>\n    </div>\n\n    <div class=\"qpart\">\n      <span class=\"pmark\">(c)</span>\n      <div><p>State how the resistance of a wire depends upon the cross-sectional area of the wire.</p><span class=\"marktag\">1</span></div>\n    </div>\n  ",
    "markScheme": [
      {
        "part": "6(a)(i)",
        "answer": "Voltmeter across X and ammeter in series anywhere in circuit",
        "marks": "B1"
      },
      {
        "part": "6(a)(ii)",
        "answer": "Any two: X and R share the p.d./e.m.f. of battery; e.m.f. = p.d.(X) + p.d.(R); as R varies, p.d. across X and R vary; increasing R increases p.d.(R) and decreases p.d.(X)",
        "marks": "B2"
      },
      {
        "part": "6(b)(i)",
        "answer": "Directly proportional",
        "marks": "B1"
      },
      {
        "part": "6(b)(ii)",
        "answer": "Resistance = 90 &times; 3.6 / 60, or 5.4 &Omega; seen",
        "marks": "B1"
      },
      {
        "part": "",
        "answer": "(I =) V/R in any form",
        "marks": "C1"
      },
      {
        "part": "",
        "answer": "1.7 A",
        "marks": "A1"
      },
      {
        "part": "6(b)(iii)",
        "answer": "As length increases, current decreases",
        "marks": "C1"
      },
      {
        "part": "",
        "answer": "(Current) inversely proportional to length",
        "marks": "A1"
      },
      {
        "part": "6(c)",
        "answer": "Inversely proportional",
        "marks": "B1"
      }
    ],
    "exemplarHTML": "\n    <h4>(a)(i) Adding the meters</h4>\n    <p>Connect the voltmeter in parallel across X (to measure the p.d. across X) and connect the ammeter in series anywhere in the circuit (to measure the current through X).</p>\n    <h4>(a)(ii) X and R as a variable potential divider</h4>\n    <p>X and R are in series, so the e.m.f. of the battery is shared between them: p.d. across X + p.d. across R = e.m.f. As R is varied, the share of the voltage changes &mdash; increasing R increases the p.d. across R and decreases the p.d. across X (and vice versa).</p>\n    <h4>(b)(i) Relationship between resistance and length</h4>\n    <p>The resistance is directly proportional to the length of the wire.</p>\n    <h4>(b)(ii) Current in a 90 cm length</h4>\n    <p>From the graph, 60&nbsp;cm of wire has a resistance of 3.6&nbsp;&Omega;. Since resistance is proportional to length:</p>\n    <div class=\"mathblock\">\\[ R = 3.6 \\times \\frac{90}{60} = 5.4\\ \\Omega \\]</div>\n    <div class=\"mathblock\">\\[ I = \\frac{V}{R} = \\frac{9.0}{5.4} = \\boxed{1.7\\ \\text{A}} \\]</div>\n    <h4>(b)(iii) Relationship between current and length</h4>\n    <p>As the length of the wire increases, the current decreases. Because R &prop; length and I&nbsp;=&nbsp;V/R at constant p.d., the current is inversely proportional to the length.</p>\n    <h4>(c) Resistance and cross-sectional area</h4>\n    <p>The resistance of a wire is inversely proportional to its cross-sectional area.</p>\n  ",
    "videoId": ""
  },
  {
    "id": 7,
    "topic": "Electromagnetic Induction",
    "ref": "5054/21/M/J/25 — Q7",
    "marks": 9,
    "qText": "Fig. 7.1 shows an alternating current (a.c.) power supply connected to a transformer. Fig. 7.1 (a) Explain how an alternating current in the primary coil produces an alternating output voltage. 3 (b) A student uses a voltmeter set on a 0&ndash;10&nbsp;V range to measure the input and output voltages. She obtains the values shown in Table 7.1. input voltage / V output voltage / V 1.2 2.4 2.3 4.6 4.8 9.6 6.4 no reading Table 7.1 (i) Suggest why no output voltage reading is obtained with this voltmeter when the input voltage is 6.4&nbsp;V. 1 (ii) The number of turns on the primary coil is 48. Calculate the number of turns on the secondary coil. 2 (c) The student uses an oscilloscope to display an alternating output voltage from the transformer. Fig. 7.2 shows the front of the oscilloscope before it is connected to the transformer. Fig. 7.2 When the oscilloscope is connected to the output of the transformer, a trace representing the alternating output voltage is displayed on the screen. (i) On Fig. 7.2, draw a trace representing an alternating output voltage on the screen. 1 (ii) Describe how to use the trace to measure the maximum value of the output voltage. 2",
    "qHTML": "\n    <p>Fig. 7.1 shows an alternating current (a.c.) power supply connected to a transformer.</p>\n    <figure class=\"qfig\">\n      <img src=\"assets/img/q7-fig1.png\" alt=\"Fig. 7.1 a.c. supply connected to a transformer\">\n      <figcaption>Fig. 7.1</figcaption>\n    </figure>\n\n    <div class=\"qpart\">\n      <span class=\"pmark\">(a)</span>\n      <div><p>Explain how an alternating current in the primary coil produces an alternating output voltage.</p><span class=\"marktag\">3</span></div>\n    </div>\n\n    <div class=\"qpart\">\n      <span class=\"pmark\">(b)</span>\n      <div>\n        <p>A student uses a voltmeter set on a 0&ndash;10&nbsp;V range to measure the input and output voltages. She obtains the values shown in Table 7.1.</p>\n        <table class=\"datatable\">\n          <tr><th>input voltage / V</th><th>output voltage / V</th></tr>\n          <tr><td>1.2</td><td>2.4</td></tr>\n          <tr><td>2.3</td><td>4.6</td></tr>\n          <tr><td>4.8</td><td>9.6</td></tr>\n          <tr><td>6.4</td><td>no reading</td></tr>\n        </table>\n        <p class=\"tablecap\">Table 7.1</p>\n        <div class=\"qpart qpart--roman\">\n          <span class=\"pmark\">(i)</span>\n          <div><p>Suggest why no output voltage reading is obtained with this voltmeter when the input voltage is 6.4&nbsp;V.</p><span class=\"marktag\">1</span></div>\n        </div>\n        <div class=\"qpart qpart--roman\">\n          <span class=\"pmark\">(ii)</span>\n          <div><p>The number of turns on the primary coil is 48. Calculate the number of turns on the secondary coil.</p><span class=\"marktag\">2</span></div>\n        </div>\n      </div>\n    </div>\n\n    <div class=\"qpart\">\n      <span class=\"pmark\">(c)</span>\n      <div>\n        <p>The student uses an oscilloscope to display an alternating output voltage from the transformer. Fig. 7.2 shows the front of the oscilloscope before it is connected to the transformer.</p>\n        <figure class=\"qfig\">\n          <img src=\"assets/img/q7-fig2.png\" alt=\"Fig. 7.2 oscilloscope screen before connection\">\n          <figcaption>Fig. 7.2</figcaption>\n        </figure>\n        <p>When the oscilloscope is connected to the output of the transformer, a trace representing the alternating output voltage is displayed on the screen.</p>\n        <div class=\"qpart qpart--roman\">\n          <span class=\"pmark\">(i)</span>\n          <div><p>On Fig. 7.2, draw a trace representing an alternating output voltage on the screen.</p><span class=\"marktag\">1</span></div>\n        </div>\n        <div class=\"qpart qpart--roman\">\n          <span class=\"pmark\">(ii)</span>\n          <div><p>Describe how to use the trace to measure the maximum value of the output voltage.</p><span class=\"marktag\">2</span></div>\n        </div>\n      </div>\n    </div>\n  ",
    "markScheme": [
      {
        "part": "7(a)",
        "answer": "Magnetic field produced by current in primary",
        "marks": "B1"
      },
      {
        "part": "",
        "answer": "Iron core transmits the field to the secondary; field is changing / alternating",
        "marks": "B1"
      },
      {
        "part": "",
        "answer": "Induction of output voltage in secondary coil",
        "marks": "B1"
      },
      {
        "part": "7(b)(i)",
        "answer": "Off the scale of the voltmeter / too large to read",
        "marks": "B1"
      },
      {
        "part": "7(b)(ii)",
        "answer": "V&#8347;/V&#7345; = N&#7345;/N&#8347; in any form",
        "marks": "C1"
      },
      {
        "part": "",
        "answer": "96",
        "marks": "A1"
      },
      {
        "part": "7(c)(i)",
        "answer": "Sensible alternating trace either side of mid-line",
        "marks": "B1"
      },
      {
        "part": "7(c)(ii)",
        "answer": "Measure or mention the height of the trace",
        "marks": "B1"
      },
      {
        "part": "",
        "answer": "Multiply height by the Y-gain value",
        "marks": "B1"
      }
    ],
    "exemplarHTML": "\n    <h4>(a) How the transformer produces an output voltage</h4>\n    <p>The alternating current in the primary coil produces a continually changing (alternating) magnetic field. The iron core carries and concentrates this field so it passes through the secondary coil. The changing field through the secondary coil induces an alternating voltage across it (electromagnetic induction).</p>\n    <h4>(b)(i) Why no reading at 6.4 V input</h4>\n    <p>This is a step-up transformer with an output roughly twice the input, so a 6.4&nbsp;V input would give about 12.8&nbsp;V output &mdash; off the top of the voltmeter's 0&ndash;10&nbsp;V scale.</p>\n    <h4>(b)(ii) Number of turns on the secondary coil</h4>\n    <div class=\"mathblock\">\\[ \\frac{V_S}{V_P} = \\frac{N_S}{N_P} \\]</div>\n    <p>From the data, V&#8347;/V&#7345; = 2.4/1.2 = 2, so:</p>\n    <div class=\"mathblock\">\\[ N_S = N_P \\times \\frac{V_S}{V_P} = 48 \\times 2 = \\boxed{96} \\]</div>\n    <h4>(c)(i) Oscilloscope trace</h4>\n    <p>Draw a sensible alternating (sine-shaped) wave, centred on the mid-line and symmetrical above and below it.</p>\n    <h4>(c)(ii) Measuring the maximum output voltage</h4>\n    <p>Measure the height of the trace from the mid-line up to a peak, in divisions on the screen. Multiply that number of divisions by the Y-gain setting to obtain the maximum (peak) value of the output voltage.</p>\n  ",
    "videoId": ""
  },
  {
    "id": 8,
    "topic": "Atomic & Nuclear Physics",
    "ref": "5054/21/M/J/25 — Q8",
    "marks": 11,
    "qText": "Plutonium-239 (\\(^{239}_{94}\\text{Pu}\\)) is an isotope that is used as the fuel in some nuclear reactors. (a) State the names of the types of particles found in a nucleus of plutonium-239, and state how many there are of each type. 2 (b) Fig. 8.1 shows the nuclear fission process that occurs within the fuel rods of the nuclear reactor. Fig. 8.1 (i) Explain how the fission process produces a chain reaction. 2 (ii) Explain how control rods are used to increase and decrease the rate of the chain reaction in a nuclear reactor. 2 (c) Plutonium-239 decays by the emission of an alpha particle (&alpha;-particle). State two differences between an alpha particle and a beta particle (&beta;-particle). 2 (d) Alpha particles from the radioactive source are detected in a cloud chamber or with a spark counter. (i) Draw a labelled diagram of either a cloud chamber or a spark counter. Label the position of the radioactive source with an S . 2 (ii) State what causes the tracks in a cloud chamber, or state what causes the sparks in a spark counter. 1",
    "qHTML": "\n    <p>Plutonium-239 (\\(^{239}_{94}\\text{Pu}\\)) is an isotope that is used as the fuel in some nuclear reactors.</p>\n\n    <div class=\"qpart\">\n      <span class=\"pmark\">(a)</span>\n      <div><p>State the names of the types of particles found in a nucleus of plutonium-239, and state how many there are of each type.</p><span class=\"marktag\">2</span></div>\n    </div>\n\n    <div class=\"qpart\">\n      <span class=\"pmark\">(b)</span>\n      <div>\n        <p>Fig. 8.1 shows the nuclear fission process that occurs within the fuel rods of the nuclear reactor.</p>\n        <figure class=\"qfig\">\n          <img src=\"assets/img/q8-fig1.png\" alt=\"Fig. 8.1 nuclear fission chain reaction diagram\">\n          <figcaption>Fig. 8.1</figcaption>\n        </figure>\n        <div class=\"qpart qpart--roman\">\n          <span class=\"pmark\">(i)</span>\n          <div><p>Explain how the fission process produces a chain reaction.</p><span class=\"marktag\">2</span></div>\n        </div>\n        <div class=\"qpart qpart--roman\">\n          <span class=\"pmark\">(ii)</span>\n          <div><p>Explain how control rods are used to increase and decrease the rate of the chain reaction in a nuclear reactor.</p><span class=\"marktag\">2</span></div>\n        </div>\n      </div>\n    </div>\n\n    <div class=\"qpart\">\n      <span class=\"pmark\">(c)</span>\n      <div><p>Plutonium-239 decays by the emission of an alpha particle (&alpha;-particle). State two differences between an alpha particle and a beta particle (&beta;-particle).</p><span class=\"marktag\">2</span></div>\n    </div>\n\n    <div class=\"qpart\">\n      <span class=\"pmark\">(d)</span>\n      <div>\n        <p>Alpha particles from the radioactive source are detected in a cloud chamber or with a spark counter.</p>\n        <div class=\"qpart qpart--roman\">\n          <span class=\"pmark\">(i)</span>\n          <div><p>Draw a labelled diagram of either a cloud chamber or a spark counter. Label the position of the radioactive source with an <b>S</b>.</p><span class=\"marktag\">2</span></div>\n        </div>\n        <div class=\"qpart qpart--roman\">\n          <span class=\"pmark\">(ii)</span>\n          <div><p>State what causes the tracks in a cloud chamber, or state what causes the sparks in a spark counter.</p><span class=\"marktag\">1</span></div>\n        </div>\n      </div>\n    </div>\n  ",
    "markScheme": [
      {
        "part": "8(a)",
        "answer": "Protons and neutrons",
        "marks": "C1"
      },
      {
        "part": "",
        "answer": "145 neutrons, 94 protons",
        "marks": "A1"
      },
      {
        "part": "8(b)(i)",
        "answer": "A neutron hits / is absorbed by a plutonium nucleus",
        "marks": "B1"
      },
      {
        "part": "",
        "answer": "At least one released neutron causes another Pu nucleus to fission",
        "marks": "B1"
      },
      {
        "part": "8(b)(ii)",
        "answer": "Control rods absorb neutrons",
        "marks": "B1"
      },
      {
        "part": "",
        "answer": "Insert / lower rods to decrease reaction; withdraw to increase it",
        "marks": "B1"
      },
      {
        "part": "8(c)",
        "answer": "Any two: charge is different; mass is different; alpha is 2p+2n / beta is an electron; ionising effect differs; penetrating power differs",
        "marks": "B2"
      },
      {
        "part": "8(d)(i)",
        "answer": "Closed container with source S, and a cooling means / volatile liquid (cloud chamber) — or fine wire and plate with source nearby (spark counter)",
        "marks": "B1"
      },
      {
        "part": "",
        "answer": "Cloud chamber: presence of vapour — or spark counter: high voltage between wire and plate",
        "marks": "B1"
      },
      {
        "part": "8(d)(ii)",
        "answer": "Ionisation (of the air)",
        "marks": "B1"
      }
    ],
    "exemplarHTML": "\n    <h4>(a) Particles in a plutonium-239 nucleus</h4>\n    <p>The nucleus contains protons and neutrons. For \\(^{239}_{94}\\text{Pu}\\) there are 94 protons and 239&nbsp;&minus;&nbsp;94&nbsp;=&nbsp;145 neutrons.</p>\n    <h4>(b)(i) How fission produces a chain reaction</h4>\n    <p>A neutron is absorbed by a plutonium-239 nucleus, causing it to split (fission) and release two or three more neutrons. At least one of these released neutrons is absorbed by another plutonium nucleus, causing that one to fission too &mdash; the process repeats, giving a chain reaction.</p>\n    <h4>(b)(ii) How control rods change the rate</h4>\n    <p>Control rods absorb neutrons. Lowering the rods further absorbs more neutrons, so fewer are left to cause fission and the reaction slows. Raising the rods absorbs fewer neutrons, so more are available and the reaction speeds up.</p>\n    <h4>(c) Two differences between alpha and beta particles</h4>\n    <p>Their charge differs &mdash; an alpha particle has charge +2, a beta particle has charge &minus;1. Their mass differs &mdash; an alpha particle is relatively heavy (2 protons + 2 neutrons), while a beta particle is an electron of very small mass.</p>\n    <h4>(d)(i) Labelled detector diagram</h4>\n    <p>Either a cloud chamber or a spark counter is acceptable. Cloud chamber: a sealed container with the source labelled S, containing a supersaturated vapour, with a means of cooling. Spark counter: a fine wire held close to a metal plate, source S nearby, with a high voltage applied between wire and plate.</p>\n    <h4>(d)(ii) Cause of the tracks / sparks</h4>\n    <p>Ionisation of the air by the alpha particles &mdash; the ions produced form the visible tracks in a cloud chamber, or trigger the sparks in a spark counter.</p>\n  ",
    "videoId": ""
  },
  {
    "id": 9,
    "topic": "Space Physics",
    "ref": "5054/21/M/J/25 — Q9",
    "marks": 10,
    "qText": "(a) The life cycle of a star begins with a large cloud of dust and gas which collapses. Five later stages of the life cycle of a very massive star are: black hole &nbsp;&middot;&nbsp; protostar &nbsp;&middot;&nbsp; red supergiant &nbsp;&middot;&nbsp; stable star &nbsp;&middot;&nbsp; supernova Place these stages in Table 9.1 in the order in which they occur. earlier time cloud of dust and gas &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; later time Table 9.1 2 (b) The original collapse of the cloud of dust and gas that formed the Sun was caused by an inward force. (i) State the name of the inward force. 1 (ii) Further collapse is prevented by an outward force. The Sun will remain in the stable stage of its life cycle for a few billion years. Describe what causes the outward force. 1 (c) One of the first supernovas ever observed is known as SN185. It was formed from the explosion of a star in the Milky Way galaxy. The remnants of SN185 are at a distance of 8200 light-years from Earth. (i) State what is meant by a &lsquo;light-year&rsquo;. 1 (ii) State the time that passed between the explosion that formed SN185 and the electromagnetic radiation from the explosion reaching Earth. 1 (iii) A recently observed supernova is SN2014J. The remnants of SN2014J are 12 million light-years from Earth, outside the Milky Way. There is no redshift seen in the electromagnetic radiation from the remnants of SN185, but a large redshift is seen in the electromagnetic radiation from the remnants of SN2014J. Explain this difference. 2 (d) Most of the atoms found in the early Universe were hydrogen and helium. The Universe now contains atoms of heavier elements. Explain how the heavier elements are formed. 2",
    "qHTML": "\n    <div class=\"qpart\">\n      <span class=\"pmark\">(a)</span>\n      <div>\n        <p>The life cycle of a star begins with a large cloud of dust and gas which collapses. Five later stages of the life cycle of a very massive star are:</p>\n        <p class=\"stagelist\">black hole &nbsp;&middot;&nbsp; protostar &nbsp;&middot;&nbsp; red supergiant &nbsp;&middot;&nbsp; stable star &nbsp;&middot;&nbsp; supernova</p>\n        <p>Place these stages in Table 9.1 in the order in which they occur.</p>\n        <table class=\"datatable datatable--stages\">\n          <tr><th>earlier time</th></tr>\n          <tr><td>cloud of dust and gas</td></tr>\n          <tr><td class=\"blankrow\">&nbsp;</td></tr>\n          <tr><td class=\"blankrow\">&nbsp;</td></tr>\n          <tr><td class=\"blankrow\">&nbsp;</td></tr>\n          <tr><td class=\"blankrow\">&nbsp;</td></tr>\n          <tr><td class=\"blankrow\">&nbsp;</td></tr>\n          <tr><th>later time</th></tr>\n        </table>\n        <p class=\"tablecap\">Table 9.1</p>\n        <span class=\"marktag\">2</span>\n      </div>\n    </div>\n\n    <div class=\"qpart\">\n      <span class=\"pmark\">(b)</span>\n      <div>\n        <p>The original collapse of the cloud of dust and gas that formed the Sun was caused by an inward force.</p>\n        <div class=\"qpart qpart--roman\">\n          <span class=\"pmark\">(i)</span>\n          <div><p>State the name of the inward force.</p><span class=\"marktag\">1</span></div>\n        </div>\n        <div class=\"qpart qpart--roman\">\n          <span class=\"pmark\">(ii)</span>\n          <div><p>Further collapse is prevented by an outward force. The Sun will remain in the stable stage of its life cycle for a few billion years. Describe what causes the outward force.</p><span class=\"marktag\">1</span></div>\n        </div>\n      </div>\n    </div>\n\n    <div class=\"qpart\">\n      <span class=\"pmark\">(c)</span>\n      <div>\n        <p>One of the first supernovas ever observed is known as SN185. It was formed from the explosion of a star in the Milky Way galaxy. The remnants of SN185 are at a distance of 8200 light-years from Earth.</p>\n        <div class=\"qpart qpart--roman\">\n          <span class=\"pmark\">(i)</span>\n          <div><p>State what is meant by a &lsquo;light-year&rsquo;.</p><span class=\"marktag\">1</span></div>\n        </div>\n        <div class=\"qpart qpart--roman\">\n          <span class=\"pmark\">(ii)</span>\n          <div><p>State the time that passed between the explosion that formed SN185 and the electromagnetic radiation from the explosion reaching Earth.</p><span class=\"marktag\">1</span></div>\n        </div>\n        <div class=\"qpart qpart--roman\">\n          <span class=\"pmark\">(iii)</span>\n          <div><p>A recently observed supernova is SN2014J. The remnants of SN2014J are 12 million light-years from Earth, outside the Milky Way. There is no redshift seen in the electromagnetic radiation from the remnants of SN185, but a large redshift is seen in the electromagnetic radiation from the remnants of SN2014J. Explain this difference.</p><span class=\"marktag\">2</span></div>\n        </div>\n      </div>\n    </div>\n\n    <div class=\"qpart\">\n      <span class=\"pmark\">(d)</span>\n      <div><p>Most of the atoms found in the early Universe were hydrogen and helium. The Universe now contains atoms of heavier elements. Explain how the heavier elements are formed.</p><span class=\"marktag\">2</span></div>\n    </div>\n  ",
    "markScheme": [
      {
        "part": "9(a)",
        "answer": "Protostar, stable star correct for first two boxes — or red supergiant, supernova, black hole correct for last three",
        "marks": "C1"
      },
      {
        "part": "",
        "answer": "Protostar, stable star, red supergiant, supernova, black hole — full correct order",
        "marks": "A1"
      },
      {
        "part": "9(b)(i)",
        "answer": "Gravity / gravitational attraction",
        "marks": "B1"
      },
      {
        "part": "9(b)(ii)",
        "answer": "High temperature / pressure of light (radiation pressure)",
        "marks": "B1"
      },
      {
        "part": "9(c)(i)",
        "answer": "Distance light travels in one year",
        "marks": "B1"
      },
      {
        "part": "9(c)(ii)",
        "answer": "8200 years",
        "marks": "B1"
      },
      {
        "part": "9(c)(iii)",
        "answer": "SN185 is not moving / has little speed away from Earth, so no redshift",
        "marks": "B1"
      },
      {
        "part": "",
        "answer": "SN2014J is much further away and moving away faster (expansion of the Universe), giving a large redshift",
        "marks": "B1"
      },
      {
        "part": "9(d)",
        "answer": "By fusion",
        "marks": "B1"
      },
      {
        "part": "",
        "answer": "During a supernova / explosion of a star (fusion mentioned)",
        "marks": "B1"
      }
    ],
    "exemplarHTML": "\n    <h4>(a) Order of the life-cycle stages</h4>\n    <p>cloud of dust and gas &rarr; protostar &rarr; stable star &rarr; red supergiant &rarr; supernova &rarr; black hole.</p>\n    <h4>(b)(i) The inward force</h4>\n    <p>Gravity (gravitational attraction).</p>\n    <h4>(b)(ii) Cause of the outward force</h4>\n    <p>Fusion reactions keep the core at a very high temperature, producing a high outward pressure (the pressure of the hot gas and of the radiation), which pushes outward against gravity.</p>\n    <h4>(c)(i) Meaning of a light-year</h4>\n    <p>A light-year is the distance that light travels in one year.</p>\n    <h4>(c)(ii) Time for the light to reach Earth</h4>\n    <div class=\"mathblock\">\\[ \\boxed{8200\\ \\text{years}} \\]</div>\n    <p>Light takes 8200 years to cross a distance of 8200 light-years.</p>\n    <h4>(c)(iii) Why the redshifts differ</h4>\n    <p>SN185 lies within our own Milky Way and is essentially not moving away from us, so its light shows no redshift. SN2014J is far outside our galaxy; because the Universe is expanding, more distant objects recede faster, so SN2014J is moving away rapidly and its light shows a large redshift.</p>\n    <h4>(d) How heavier elements are formed</h4>\n    <p>Heavier elements are built up by nuclear fusion inside stars, and the heaviest elements are formed and scattered into space when a massive star explodes as a supernova.</p>\n  ",
    "videoId": ""
  }
];
