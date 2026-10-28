/**
 * Oxybott Product Database
 * Real STEM education kits with authentic specifications, age brackets, and features
 */

const OXYBOTT_PRODUCTS = [
  {
    id: "qd022",
    sku: "OXY-QD022",
    name: "Oxybott QD022 4-DOF Programmable Robot Arm Kit",
    shortName: "Programmable Robot Arm Kit",
    series: "Inventor Series",
    category: "Robotics",
    age: "12+ & Makers",
    grade: "Grade 6-12",
    price: 89.99,
    originalPrice: 109.99,
    rating: 4.9,
    reviewsCount: 142,
    badge: "Bestseller",
    image: "assets/images/qd022-robot-arm.png",
    inStock: true,
    tagline: "4-DOF ESP32 Dual-Core Robotic Arm with Wireless Bluetooth & Wi-Fi Control",
    description: "The Oxybott QD022 4-DOF Programmable Robot Arm Kit is engineered for high school STEM education, maker spaces, and robotics enthusiasts. Powered by the high-performance ESP32 microcontroller, it supports block-based OxyCode, Arduino C++, and MicroPython programming. Features 4 durable metal-gear servos, dual joystick controllers, an OLED status display, and smartphone wireless app control.",
    highlights: [
      "ESP32 dual-core 240MHz controller board with onboard Wi-Fi and Bluetooth",
      "4 metal-gear high-torque precision servos for smooth 4-axis robotic articulation",
      "Tri-lingual programming: OxyCode (Scratch block), Arduino IDE (C++), and MicroPython",
      "Dual joystick manual control module + Mobile app Bluetooth remote control",
      "OLED display showing real-time angles, coordinates, and operating modes",
      "Includes 20+ comprehensive curriculum lessons and step-by-step video tutorials"
    ],
    specs: {
      "Microcontroller": "ESP32-WROOM-32 (240MHz Dual Core)",
      "Degrees of Freedom": "4-DOF (Base Rotation, Shoulder, Elbow, Gripper)",
      "Operating Voltage": "6V - 9V DC (Dual 18650 Battery Holder included)",
      "Servos": "4x MG90S Metal-Gear High-Torque Servos",
      "Communication": "Wi-Fi 802.11 b/g/n, Bluetooth 4.2 BLE",
      "Input Modules": "Dual Analog Joystick Module, 0.96 inch I2C OLED Display",
      "Programming Environments": "OxyCode (Blockly), Arduino IDE, Thonny (MicroPython)",
      "Dimensions": "260 x 160 x 300 mm (assembled)",
      "Weight": "680g"
    },
    boxContents: [
      "1x Oxybott ESP32 Main Robotics Controller Board",
      "4x High-Precision Metal-Gear MG90S Servos",
      "1x Laser-cut High-durability Acrylic Robotic Arm Chassis set",
      "1x Dual Joystick Controller expansion board",
      "1x 0.96-inch OLED I2C Display module",
      "1x Dual 18650 Battery Case with power switch",
      "1x Complete hardware screw and standoff package",
      "1x Phillips screwdriver and mini wrench",
      "1x Type-C USB programming cable",
      "1x Quick Start Guide & Tutorial Card"
    ]
  },
  {
    id: "qd001",
    sku: "OXY-QD001",
    name: "Oxybott QD001 Omni-Wheel Smart Robot Car Kit",
    shortName: "Smart Robot Car Kit",
    series: "Explorer Series",
    category: "Robotics",
    age: "8+ & Beginners",
    grade: "Grade 3-8",
    price: 69.99,
    originalPrice: 84.99,
    rating: 4.8,
    reviewsCount: 218,
    badge: "Popular",
    image: "assets/images/qd001-robot-car.png",
    inStock: true,
    tagline: "360° Omnidirectional Mecanum Wheel Coding Car with Ultrasonic Obstacle Avoidance",
    description: "The Oxybott QD001 is a dynamic STEM robot car featuring 4-wheel independent drive Mecanum omnidirectional wheels. Kids and students learn coding through line tracking, obstacle dodging, ultrasonic ranging, light chasing, and custom maze navigation using OxyCode or Arduino.",
    highlights: [
      "4-wheel independent drive with genuine Mecanum wheels for 360° translation",
      "Ultrasonic distance sensor with RGB headlights for expressive obstacle avoidance",
      "3-channel high-precision infrared line tracking sensor array",
      "IR remote controller + iOS/Android Oxybott App remote control",
      "Easy plug-and-play wiring connectors—no soldering required"
    ],
    specs: {
      "Microcontroller": "ESP32 Smart Controller Shield",
      "Chassis": "Reinforced dual-layer PCB frame with integrated power management",
      "Motors": "4x High-Speed DC Gear Motors (1:48 reduction ratio)",
      "Wheels": "60mm Mecanum Omnidirectional Wheels",
      "Sensors": "Ultrasonic with RGB, 3-Way Line Tracking, IR Receiver",
      "Power": "7.4V Rechargeable Lithium Battery pack support"
    },
    boxContents: [
      "1x Robot Car PCB Main Board with integrated drivers",
      "4x DC Gear Motors and Mecanum wheels",
      "1x Ultrasonic RGB module & bracket",
      "1x 3-Channel Line Tracking module",
      "1x IR Remote control",
      "1x Black line tracking testing track map",
      "1x USB-C Cable and Assembly Tool set"
    ]
  },
  {
    id: "qe011",
    sku: "OXY-QE011",
    name: "Oxybott QE011 STEM Weather Station Kit",
    shortName: "Weather Station STEM Kit",
    series: "Explorer Series",
    category: "Smart IoT",
    age: "8+ & Beginners",
    grade: "Grade 3-6",
    price: 49.99,
    originalPrice: 59.99,
    rating: 4.9,
    reviewsCount: 95,
    badge: "New",
    image: "assets/images/qe011-weather-station.png",
    inStock: true,
    tagline: "Real-time IoT Environmental Monitoring with Wi-Fi Cloud Sync & LCD Screen",
    description: "Inspire budding meteorologists and environmental scientists! The QE011 Weather Station kit measures temperature, humidity, atmospheric pressure, and rain/water levels. Students learn how to read real-time atmospheric sensor data and stream it via Wi-Fi to cloud IoT dashboards.",
    highlights: [
      "DHT11 temperature & humidity sensor + analog rain/water droplet detector",
      "I2C 1602 LCD display with customizable graphic weather icons",
      "ESP32 Wi-Fi IoT connectivity to ThingsSpeak and MQTT cloud services",
      "Laser-cut eco-friendly wooden weather-station cottage structure"
    ],
    specs: {
      "Microcontroller": "ESP32 IoT Development Core",
      "Sensors": "DHT11, Analog Rain Sensor, Ambient Light Sensor",
      "Display": "1602 LCD I2C Character Display with Blue Backlight",
      "Connectivity": "2.4GHz Wi-Fi (MQTT, HTTP REST, ThingSpeak)",
      "Power": "USB 5V or Battery Holder"
    },
    boxContents: [
      "1x ESP32 IoT Controller board",
      "1x Wooden weather cottage building kit",
      "1x DHT11 Temp/Humidity sensor",
      "1x Raindrop sensor board",
      "1x 1602 LCD I2C screen",
      "Connecting jumper wires and mounting pack"
    ]
  },
  {
    id: "qe001",
    sku: "OXY-QE001",
    name: "Oxybott QE001 Smart Home IoT Starter Kit",
    shortName: "Smart Home IoT Kit",
    series: "Explorer Series",
    category: "Smart IoT",
    age: "10+ & Middle School",
    grade: "Grade 4-8",
    price: 59.99,
    originalPrice: 74.99,
    rating: 4.9,
    reviewsCount: 168,
    badge: "Top Choice",
    image: "assets/images/qe001-smart-home.png",
    inStock: true,
    tagline: "Build a miniature automated smart house with RFID door, gas alarm & solar lights",
    description: "Experience the future of home automation. The Oxybott QE001 kit lets students build an interactive model home complete with smart door access via RFID cards, gas and flame safety alarms, automated windows, and voice/app-controlled smart lighting.",
    highlights: [
      "RFID card reader door lock with micro-servo deadbolt mechanism",
      "MQ-2 gas/smoke sensor with buzzer safety warning system",
      "PIR motion detector for automated porch lighting",
      "Mobile App remote control via local Wi-Fi or Bluetooth"
    ],
    specs: {
      "Core Board": "Oxybott ESP32 Smart Home Shield",
      "Sensors": "PIR Motion, MQ-2 Gas, Photoresistor, Steam/Rain",
      "Actuators": "SG90 Servo (Door/Window), RGB LED, Active Buzzer",
      "Security": "RC522 13.56MHz RFID Reader with Keyfob cards"
    },
    boxContents: [
      "1x Wooden architectural model house plates",
      "1x ESP32 Controller & Smart Home Shield",
      "1x RC522 RFID module & tags",
      "1x MQ-2 Smoke sensor",
      "1x SG90 Servo and hardware kit",
      "1x Illustrated 80-page project manual"
    ]
  },
  {
    id: "qd021",
    sku: "OXY-QD021",
    name: "Oxybott QD021 Bionic Biped Walking Robot Kit",
    shortName: "Bionic Biped Robot Kit",
    series: "Inventor Series",
    category: "Robotics",
    age: "12+ & Makers",
    grade: "Grade 6-12",
    price: 79.99,
    originalPrice: 94.99,
    rating: 4.7,
    reviewsCount: 88,
    badge: "STEM Star",
    image: "assets/images/qd021-biped-robot.png",
    inStock: true,
    tagline: "Two-legged human-like walking robot with inverse kinematics & balance algorithms",
    description: "An advanced bionic robotics kit that introduces students to kinematics, gait planning, and center-of-mass balancing. With 4 digital servos driving two legs, the biped can walk forward, dance, turn, and avoid obstacles autonomously.",
    highlights: [
      "4-axis bipedal locomotion with smooth algorithmic gait transitions",
      "Ultrasonic eyes with animated LED expression matrix",
      "Preloaded with 10 dance moves, obstacle avoidance, and manual joystick control",
      "Extensive open-source Arduino and OxyCode kinematic library"
    ],
    specs: {
      "Microcontroller": "ESP32 High-Current Robotics Board",
      "Actuation": "4x High-Precision Digital Servos",
      "Gait Modes": "Walking, Turning, Dancing, Kicking",
      "Battery": "Rechargeable 7.4V Li-ion supported"
    },
    boxContents: [
      "1x Biped Robot Acrylic/Aluminum structural chassis",
      "4x Digital servos",
      "1x ESP32 Robot controller",
      "1x Ultrasonic sensor head module",
      "1x Screwdriver set and assembly manual"
    ]
  },
  {
    id: "qd020",
    sku: "OXY-QD020",
    name: "Oxybott QD020 Quadruped Spider Robot Kit",
    shortName: "Quadruped Spider Robot Kit",
    series: "Inventor Series",
    category: "Robotics",
    age: "12+ & Makers",
    grade: "Grade 7-12",
    price: 84.99,
    originalPrice: 99.99,
    rating: 4.8,
    reviewsCount: 112,
    badge: "Popular",
    image: "assets/images/qd020-spider-robot.png",
    inStock: true,
    tagline: "8-Servo Bio-inspired Quadruped Robot with Crawling, Creeping & Climbing Gaits",
    description: "Bring biomimetic engineering into your classroom. The QD020 Quadruped Spider features 8 servos (2 per leg) allowing multi-directional crawling, body height stabilization, self-leveling, and obstacle navigation.",
    highlights: [
      "8-servo bio-inspired quadruped mechanism with realistic crawl kinematics",
      "Multi-mode gait control: Trot, Walk, Wave, and Twist",
      "Bluetooth smartphone control with virtual joystick and posture sliders",
      "Compatible with custom 3D printable leg attachments"
    ],
    specs: {
      "Servos": "8x SG90 / MG90S High-torque precision servos",
      "Controller": "ESP32 16-Channel Servo Driver Shield",
      "DOF": "8 Degrees of Freedom (2 DOF per leg)",
      "Wireless": "Bluetooth 4.2 BLE + Wi-Fi AP mode"
    },
    boxContents: [
      "1x Laser-cut Spider Robot body and leg assemblies",
      "8x Precision servos",
      "1x ESP32 multi-servo controller board",
      "1x Ultrasonic distance sensor",
      "1x Battery enclosure and connection cables"
    ]
  },
  {
    id: "qe023",
    sku: "OXY-QE023",
    name: "Oxybott QE023 3-in-1 Smart Home Classroom Education Kit (Year 1 - Level 1)",
    shortName: "Smart Home Education Display Kit",
    series: "Education Series",
    category: "Classroom Sets",
    age: "10-15 & Schools",
    grade: "Grade 5-9",
    price: 129.99,
    originalPrice: 149.99,
    rating: 5.0,
    reviewsCount: 76,
    badge: "Educator Choice",
    image: "assets/images/qe023-smart-home-edu.png",
    inStock: true,
    tagline: "Complete STEM curriculum kit for schools with modular magnetic display boards",
    description: "Engineered specifically for K-12 STEM educators. The QE023 provides an all-in-one classroom demonstration platform featuring modular magnetic electronics, plug-and-play RJ11/Easy-Plug cables, teacher slides, lesson plans, and student assessment rubrics.",
    highlights: [
      "Modular magnetic classroom display wall for easy whiteboard demonstrations",
      "Easy-Plug anti-reverse color-coded cables eliminate wiring mistakes",
      "Aligned with CSTA, NGSS, and Cambridge STEM curriculum standards",
      "Includes 24 ready-to-teach lesson plans, PPT slides, and student worksheets"
    ],
    specs: {
      "Target Audience": "Schools, Maker Spaces, STEM Clubs (1-2 students per kit)",
      "Interconnection": "Oxybott Easy-Plug 4-Pin RJ11 color-coded system",
      "Curriculum Coverage": "24 Lessons (Basics, Sensors, IoT Cloud, Smart Home Logic)",
      "Certifications": "CE, FCC, RoHS, EN71 STEM safety certified"
    },
    boxContents: [
      "1x Durable ABS Educator Storage Case with custom foam dividers",
      "1x Large Magnetic Demonstration Mount Board",
      "1x ESP32 Educational Motherboard",
      "12x Easy-Plug Sensor and Actuator Modules",
      "12x Color-coded Easy-Plug Cables",
      "1x Teacher Curriculum USB Drive + Full Printed Teacher Guide"
    ]
  },
  {
    id: "qe036",
    sku: "OXY-QE036",
    name: "Oxybott QE036 Intelligent Transportation STEM Kit (Level 2)",
    shortName: "Intelligent Transportation Display Kit",
    series: "Education Series",
    category: "Classroom Sets",
    age: "11-16 & Schools",
    grade: "Grade 6-10",
    price: 139.99,
    originalPrice: 159.99,
    rating: 4.9,
    reviewsCount: 54,
    badge: "Curriculum Kit",
    image: "assets/images/qe036-transportation-kit.jpg",
    inStock: true,
    tagline: "Simulate smart city traffic lights, toll gates, speed cameras & automated parking",
    description: "Bring civil engineering and computer science together! Students build smart traffic intersections with pedestrian lights, license plate recognition simulation, automated barrier toll booths, and ultrasound parking spot monitors.",
    highlights: [
      "Smart traffic intersection simulation with programmable ped-crossings",
      "Servo-operated automated parking barrier with RFID payment gate",
      "Ultrasonic vehicle counter and OLED speed radar display",
      "16 structured project lessons with real-world smart city problems"
    ],
    specs: {
      "System Type": "Modular Smart City Simulation Tabletop Kit",
      "Modules": "Traffic Light, Sound Sensor, Ultrasonic, Servo Barrier, RFID, OLED",
      "Power": "12V DC Adapter or Power Bank support",
      "Software": "OxyCode Block & Python compatible"
    },
    boxContents: [
      "1x Foldable Smart City Road Map Grid",
      "1x Intersection Traffic light tower module",
      "1x Automated Barrier Gate module with servo",
      "1x ESP32 Transportation Master Core",
      "1x RFID Scanner and toll cards",
      "1x Educator curriculum binder"
    ]
  },
  {
    id: "qe037",
    sku: "OXY-QE037",
    name: "Oxybott QE037 Smart Factory Industry 4.0 STEM Kit",
    shortName: "Smart Factory Display Kit",
    series: "Education Series",
    category: "Classroom Sets",
    age: "12-18 & Vocational",
    grade: "Grade 7-12",
    price: 159.99,
    originalPrice: 189.99,
    rating: 5.0,
    reviewsCount: 42,
    badge: "Industry 4.0",
    image: "assets/images/qe037-smart-factory.jpg",
    inStock: true,
    tagline: "Hands-on industrial automation with conveyor belt, color sorter & robotic arm feeder",
    description: "An authentic Industry 4.0 educational simulator. Features an electric conveyor belt, color sensor inspection station, pneumatic/servo reject mechanism, and robotic pick-and-place feeder for hands-on mechatronics and manufacturing logic training.",
    highlights: [
      "DC motorized conveyor belt with variable speed PWM control",
      "Color recognition sensor sorting colored workpieces automatically",
      "Emergency stop E-stop safety circuit and status beacon tower",
      "Comprehensive PLC-style logic programming in OxyCode and Python"
    ],
    specs: {
      "Application": "Industrial Automation & Mechatronics Education",
      "Mechanisms": "Conveyor Belt, Color Sorter, Diverter Arm, Beacon Light",
      "Sensors": "TCS34725 RGB Color Sensor, Infrared Object Detectors, Limit Switches",
      "Communication": "Wi-Fi MQTT Industrial IoT dashboard integration"
    },
    boxContents: [
      "1x Smart Factory Modular Table Base",
      "1x Mini Conveyor Belt with DC motor",
      "1x Color sorting sensor and diverter arm",
      "1x Industrial Warning Tower Light module",
      "1x ESP32 Factory Controller and wiring harness",
      "1x Comprehensive Teacher Lesson Guide"
    ]
  },
  {
    id: "qe200",
    sku: "OXY-QE200",
    name: "Oxybott QE200 ESP32 Ultimate Maker Starter Kit",
    shortName: "ESP32 Basic Starter Kit",
    series: "Maker Series",
    category: "Electronics",
    age: "All Ages & Makers",
    grade: "All Grades",
    price: 39.99,
    originalPrice: 49.99,
    rating: 4.9,
    reviewsCount: 310,
    badge: "Essential",
    image: "assets/images/qe200-starter-kit.jpg",
    inStock: true,
    tagline: "50+ electronic components, sensors, displays & breadboard with 35 guided tutorials",
    description: "The ideal foundational electronics kit for anyone wanting to master the ESP32. Comes with resistors, LEDs, buzzers, relays, photoresistors, potentiometer, 7-segment displays, LCD screen, and step-by-step breadboard wiring tutorials.",
    highlights: [
      "Includes Oxybott ESP32-WROOM development board with USB-C",
      "Over 50 components: sensors, buttons, RGB LEDs, relays, and displays",
      "35 detailed tutorials from 'Blink LED' to 'Wi-Fi Web Server'",
      "Clear color-coded wiring schematics for beginners"
    ],
    specs: {
      "Board": "Oxybott ESP32 Development Board (38-pin Type-C)",
      "Breadboard": "830-Point High Quality Solderless Breadboard",
      "Included Projects": "35 Step-by-step lessons with full code",
      "Packaging": "Sturdy double-latch component organizer box"
    },
    boxContents: [
      "1x ESP32 Development Board",
      "1x 830-Tie Point Breadboard",
      "65x Flexible jumper wires + 20x Dupont cables",
      "30x Resistors, 15x LEDs, 1x Active/Passive Buzzer set",
      "1x 1602 I2C LCD, 1x 7-Segment display, 1x Potentiometer",
      "Sensors: Light, Tilt, Sound, Temperature",
      "1x Component storage case"
    ]
  },
  {
    id: "qe202",
    sku: "OXY-QE202",
    name: "Oxybott QE202 ESP32 Advanced Sensor & IoT Development Kit",
    shortName: "ESP32 Advanced Sensor Kit",
    series: "Maker Series",
    category: "Electronics",
    age: "14+ & Makers",
    grade: "Grade 8-12",
    price: 64.99,
    originalPrice: 79.99,
    rating: 4.8,
    reviewsCount: 138,
    badge: "Advanced",
    image: "assets/images/qe202-sensor-kit.jpg",
    inStock: true,
    tagline: "37 essential sensor modules with standardized 3-pin headers for rapid prototyping",
    description: "Supercharge your maker projects with 37 precision sensor modules! Includes environmental, motion, sound, optical, and electromagnetic sensors with standardized 3-pin headers compatible with ESP32, Arduino, and Raspberry Pi.",
    highlights: [
      "37 modular sensor units with standardized anti-static packaging",
      "Comprehensive pinout diagrams, sample codes, and sensor physics explanations",
      "Great for science fairs, robotics, IoT telemetry, and capstone projects"
    ],
    specs: {
      "Module Count": "37 Sensor Modules",
      "Voltage Rating": "3.3V - 5V DC compatible",
      "Supported Boards": "ESP32, ESP8266, Arduino UNO/Mega, Raspberry Pi, Micro:bit"
    },
    boxContents: [
      "37x Sensor modules (Gyroscope, Ultrasonic, Temperature, Flame, Hall, Touch, etc.)",
      "40-Pin Female-to-Female Dupont ribbon cables",
      "Pinout guide card & organizer case"
    ]
  },
  {
    id: "qd024",
    sku: "OXY-QD024",
    name: "Oxybott QD024 Micro:bit Smart Robot Car Kit",
    shortName: "Micro:bit Robot Car Kit",
    series: "Explorer Series",
    category: "Robotics",
    age: "8+ & Grade 3+",
    grade: "Grade 3-6",
    price: 54.99,
    originalPrice: 64.99,
    rating: 4.8,
    reviewsCount: 89,
    badge: "For Micro:bit",
    image: "assets/images/qd024-microbit-car.png",
    inStock: true,
    tagline: "Graphical MakeCode programming robot car designed for BBC Micro:bit v1 & v2",
    description: "Designed specifically for elementary students using the BBC Micro:bit. Fast slot-in connector, dual tracking sensors, ultrasonic eyes, and programmable RGB headlights make learning MakeCode intuitive and playful.",
    highlights: [
      "Direct vertical slot-in connector for BBC Micro:bit v1 and v2",
      "Block-based Microsoft MakeCode drag-and-drop programming",
      "Integrated motor driver, RGB underglow, buzzer, and line tracking"
    ],
    specs: {
      "Compatibility": "BBC Micro:bit v1 / v2",
      "Software": "Microsoft MakeCode, Python, OxyCode",
      "Chassis": "Integrated PCB with high-grip rubber wheels"
    },
    boxContents: [
      "1x QD024 Micro:bit Car chassis",
      "1x Ultrasonic distance sensor",
      "1x Line tracking map and manual"
    ]
  },
  {
    id: "qd028",
    sku: "OXY-QD028",
    name: "Oxybott QD028 2-in-1 Football & Battle Car Kit",
    shortName: "Football & Battle Car Kit",
    series: "Explorer Series",
    category: "Robotics",
    age: "8+ & Fun Coding",
    grade: "Grade 3-8",
    price: 59.99,
    originalPrice: 69.99,
    rating: 4.9,
    reviewsCount: 104,
    badge: "Interactive",
    image: "assets/images/qd028-battle-car.webp",
    inStock: true,
    tagline: "Exciting 2-in-1 competition car with football kicker mechanism & balloon pop battle mode",
    description: "Make coding social and exciting! Students build and code their own robotic competition car featuring a mechanical servo-driven football kicker attachment and balloon battle spikes for classroom robotics tournaments.",
    highlights: [
      "2-in-1 modular attachments: Football penalty kicker & Balloon battle mode",
      "Fast 2.4GHz wireless control with high-maneuverability drift steering",
      "Includes mini soccer ball, goal nets, and tournament tournament rules"
    ],
    specs: {
      "Modes": "Soccer Kicker Mode / Balloon Battle Mode",
      "Control": "2.4G Wireless Gamepad or Mobile App",
      "Motors": "Dual High-RPM DC Gear Motors"
    },
    boxContents: [
      "1x Competition robot car body",
      "1x Servo kicker mechanism",
      "1x Balloon battle armor frame",
      "1x Mini football & goal net set",
      "1x Wireless gamepad controller"
    ]
  },
  {
    id: "qe002",
    sku: "OXY-QE002",
    name: "Oxybott QE002 Smart Agriculture & Farm IoT Kit",
    shortName: "Smart Farm Starter Kit",
    series: "Explorer Series",
    category: "Smart IoT",
    age: "10+ & Middle School",
    grade: "Grade 4-9",
    price: 64.99,
    originalPrice: 79.99,
    rating: 4.9,
    reviewsCount: 63,
    badge: "Eco-Tech",
    image: "assets/images/qe002-smart-farm.png",
    inStock: true,
    tagline: "Automated greenhouse irrigation, soil moisture sensing & sunlight tracking",
    description: "Connect agriculture and technology. Students construct a model greenhouse with automated soil moisture monitoring, submersible 5V water pump automatic watering, ventilation fan, and OLED sensor data graphs.",
    highlights: [
      "Capacitive corrosion-resistant soil moisture sensor",
      "Automated mini water pump with relay control for precision irrigation",
      "OLED telemetry display showing soil wetness, temperature, and pump status",
      "Wi-Fi plant health alert notifications"
    ],
    specs: {
      "Sensors": "Capacitive Soil Moisture, DHT11 Temp/Humidity, Photoresistor",
      "Actuators": "Submersible 5V Water Pump, DC Fan, Relay Switch",
      "Core": "ESP32 IoT Farming Shield"
    },
    boxContents: [
      "1x Wooden greenhouse model framework",
      "1x ESP32 Farm controller",
      "1x Capacitive soil sensor & water tubing",
      "1x 5V Water pump and relay module",
      "1x Instructional project guide"
    ]
  },
  {
    id: "qe032",
    sku: "OXY-QE032",
    name: "Oxybott QE032 TruckBott Autonomous Logistics Robot",
    shortName: "TruckBott Smart Car Kit",
    series: "Education Series",
    category: "Classroom Sets",
    age: "14+ & Grade 8+",
    grade: "Grade 8-12",
    price: 119.99,
    originalPrice: 139.99,
    rating: 4.9,
    reviewsCount: 47,
    badge: "Logistics AI",
    image: "assets/images/qe032-truckbott.png",
    inStock: true,
    tagline: "Autonomous warehouse logistics transport robot with automated cargo lifting pallet",
    description: "Simulate modern Amazon-style smart warehouse fulfillment. The TruckBott follows automated QR code floor markers and magnetic line tracks to pick up cargo pallets, transport items between stations, and deposit them safely.",
    highlights: [
      "Motorized scissor-lift cargo loading platform",
      "High-precision multi-sensor floor navigation and obstacle safety radar",
      "Simulates AGV (Automated Guided Vehicle) industrial warehouse logistics",
      "Python and OxyCode warehouse fleet simulation libraries"
    ],
    specs: {
      "Type": "Automated Guided Logistics Vehicle (AGV)",
      "Lift Mechanism": "Linear actuator motorized pallet lift",
      "Sensors": "5-Way Line array, Dual Ultrasonic, Color cargo recognizer",
      "Payload Capacity": "Up to 1.5 kg cargo"
    },
    boxContents: [
      "1x Heavy-duty aluminum AGV chassis",
      "1x Motorized scissor lift bed",
      "3x Mini wooden cargo pallets",
      "1x ESP32 Logistics master board",
      "1x Warehouse navigation course map"
    ]
  }
];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { OXYBOTT_PRODUCTS };
}
