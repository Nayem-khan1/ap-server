export type ThunderbitTranslationBlock =
  | {
      type: "text";
      value_en: string;
    }
  | {
      type: "heading";
      value_en: string;
      level?: number;
    }
  | {
      type: "image";
      url: string;
      caption_en?: string;
    };

export interface ThunderbitBlogSeedTranslation {
  fileName: string;
  title_en: string;
  slug: string;
  category: string;
  tags: string[];
  blocks: ThunderbitTranslationBlock[];
}

function buildDummyImageUrl(
  label: string,
  background: string,
  foreground: string,
): string {
  const text = encodeURIComponent(label).replace(/%20/g, "+");
  return `https://placehold.co/1600x900/${background}/${foreground}/png?text=${text}`;
}

function kalpanaImage(label: string): string {
  return buildDummyImageUrl(label, "0f172a", "e2e8f0");
}

function nebulaImage(label: string): string {
  return buildDummyImageUrl(label, "111827", "f8fafc");
}

const kalpanaChawlaBlocks: ThunderbitTranslationBlock[] = [
  {
    type: "text",
    value_en:
      "Kalpana Chawla was born on March 17, 1962, in Karnal, Haryana, India. She was the youngest of four siblings. During summer nights on the rooftop, she would gaze in wonder at the stars glittering across the sky.",
  },
  {
    type: "text",
    value_en:
      "Born in Karnal, Chawla was fascinated by flight from childhood. She held multiple pilot licenses, including licenses for airplanes, gliders, and seaplanes.",
  },
  {
    type: "image",
    url: kalpanaImage("Kalpana Chawla 01"),
  },
  {
    type: "heading",
    value_en: "Education",
    level: 2,
  },
  {
    type: "text",
    value_en:
      "Undergraduate studies: Kalpana completed her schooling at Tagore Bal Niketan Senior Secondary School in Karnal and passed class twelve in 1978. Her dream was to study engineering, but her father believed teaching or medicine were better choices for girls. Kalpana stayed firm and refused to study anything other than engineering.",
  },
  {
    type: "text",
    value_en:
      "With her mother's support, she finally received permission to pursue that dream and enrolled at Punjab Engineering College in Chandigarh. In 1982, she completed her bachelor's degree in aeronautical engineering, ranked third in her class, and became the first female graduate from that college.",
  },
  {
    type: "text",
    value_en:
      "Postgraduate studies: Because of her excellent results and her active involvement with the college's Aero and Astro Society, she easily earned the opportunity to study for a master's degree in aerospace engineering at the University of Texas in the United States. Recalling her childhood in an interview, she said,",
  },
  {
    type: "text",
    value_en:
      "We used to ask our father to take us on airplane rides, and he would take us on Pushpak and toy planes. I think that is what connected me to aerospace engineering.",
  },
  {
    type: "text",
    value_en:
      "She earned her first master's degree from the University of Texas in 1984. She later completed a second master's degree in aerospace engineering at the University of Colorado Boulder in 1986.",
  },
  {
    type: "text",
    value_en: "PhD: She finished her doctoral studies in 1988 and earned a PhD.",
  },
  {
    type: "image",
    url: kalpanaImage("Kalpana Chawla 02"),
  },
  {
    type: "text",
    value_en:
      "In her personal life, Kalpana married French citizen Jean-Pierre Harrison in 1983. They had no children. She became a United States citizen in 1991.",
  },
  {
    type: "text",
    value_en:
      "After completing her PhD in 1988, Chawla joined NASA's Ames Research Center, where she specialized in computational fluid dynamics for aircraft. She later continued aerodynamics research in the private sector. NASA selected her as an astronaut in late 1994, and she began astronaut training in 1995.",
  },
  {
    type: "image",
    url: kalpanaImage("Kalpana Chawla 03"),
  },
  {
    type: "text",
    value_en:
      "Alongside spaceflight preparation, astronauts also work on ground-based technical projects. Chawla contributed to the development of the Robotic Situational Awareness Display, a tool that helped astronauts operate robotic arms. She also tested Space Shuttle control software.",
  },
  {
    type: "text",
    value_en:
      "Kalpana Chawla spent more than thirty days in space across two Space Shuttle missions. Her talent and intelligence quickly earned her a place in human spaceflight.",
  },
  {
    type: "heading",
    value_en: "First Space Mission",
    level: 2,
  },
  {
    type: "text",
    value_en:
      "She first received the opportunity to join a space mission in 1996, and that marked the beginning of her first journey into space. On November 19, 1997, she flew aboard Space Shuttle Columbia with six other astronauts from Kennedy Space Center. NASA named the mission STS-87, the shuttle's twenty-fourth flight. In orbit, the crew circled Earth 252 times and traveled about 16.2 million miles. One of their main tasks was to send microgravity research data back to mission control. During STS-87, Chawla was responsible for deploying the Spartan satellite, which malfunctioned and later had to be recovered during a spacewalk by Winston Scott and Takao Doi. A five-month NASA investigation later cleared her, pointing instead to software-interface problems and procedural gaps between the crew and ground control. After the mission, she was assigned a technical role in the Astronaut Office to support space-station work.",
  },
  {
    type: "image",
    url: kalpanaImage("Kalpana Chawla 04"),
  },
  {
    type: "heading",
    value_en: "Second Space Mission and Death",
    level: 2,
  },
  {
    type: "text",
    value_en:
      "In 2000, she was selected again as a mission specialist for STS-107, the final mission of Space Shuttle Columbia. The mission had originally been expected to launch in January 2001, but repeated delays pushed the launch to 2003 from Kennedy Space Center. The shuttle spent 15 days and 22 hours in space. Just 81.7 seconds after liftoff, it suffered serious damage when a piece of foam struck the left wing, even though the mission itself continued.",
  },
  {
    type: "text",
    value_en:
      "As difficult as it is to hear, that is one of the harsh realities of spaceflight: once a spacecraft leaves Earth, there is often nothing anyone can do if a catastrophic failure begins.",
  },
  {
    type: "text",
    value_en:
      "On February 1, 2003, Columbia was scheduled to land at 7:46 p.m. Indian time on Runway 33 of the Shuttle Landing Facility. After spending 15 days, 22 hours, and 32 seconds in space, the shuttle was approaching what should have been a safe return through Earth's atmosphere.",
  },
  {
    type: "text",
    value_en:
      "At around 7:10 p.m., Columbia entered the atmosphere, but superheated air began rushing through the damaged area in the wing. The unbearable heat caused the astronauts to lose consciousness, and the shuttle's systems gradually failed. Within minutes, around 7:30 p.m., Columbia broke apart in a fiery explosion and fell over Texas like a shower of meteors. Although STS-107 did not end successfully, Kalpana Chawla and her crewmates earned lasting honor. Their sudden deaths were heartbreaking, but their sacrifice was not in vain.",
  },
  {
    type: "image",
    url: kalpanaImage("Kalpana Chawla 05"),
  },
  {
    type: "heading",
    value_en: "Honors",
    level: 2,
  },
  {
    type: "text",
    value_en:
      "She was posthumously awarded the Congressional Space Medal of Honor.",
  },
  {
    type: "text",
    value_en:
      "Several roads, universities, institutions, and scholarships were named in Kalpana Chawla's honor. One of the seven peaks in the Columbia Hills was also named after her.",
  },
  {
    type: "text",
    value_en:
      "According to her last wish, her cremated remains were scattered in Zion National Park in Utah.",
  },
  {
    type: "text",
    value_en: "NASA dedicated a supercomputer to Kalpana Chawla.",
  },
];

const nebulaBlocks: ThunderbitTranslationBlock[] = [
  {
    type: "text",
    value_en:
      "When we look up at the night sky, it is hard not to be captivated by the breathtaking beauty and endless scale of the universe. Among the countless celestial objects that decorate the cosmos, nebulae stand out as some of the most enchanting and mysterious wonders. These vast clouds of gas and dust scattered across space reveal the remarkable processes of stellar birth and death, offering astronomers and skywatchers a canvas of vivid colors and otherworldly shapes.",
  },
  {
    type: "image",
    url: nebulaImage("Nebula Study 01"),
  },
  {
    type: "heading",
    value_en: "What Exactly Is a Nebula?",
    level: 2,
  },
  {
    type: "text",
    value_en:
      "A nebula is a giant cloud of dust and gas in space. Some nebulae come from gas and dust thrown out by the explosion of a dying star, or supernova. Others are regions where new stars are beginning to form. That is why some nebulae are called stellar nurseries.",
  },
  {
    type: "text",
    value_en:
      "The word nebula comes from the Greek word for cloud. Nebulae appear in many shapes and fascinate people who observe and photograph deep-sky objects. Most nebulae are enormous, and some stretch hundreds of light-years across. They do contain mass and are denser than the space around them, yet many are still less dense than even the strongest vacuum we can create on Earth. Nebulae are usually made mostly of hydrogen and helium, the most common and stable elements in the universe. A nebula can also form when a star goes through major changes, such as excessive fusion in its core.",
  },
  {
    type: "image",
    url: nebulaImage("Nebula Study 02"),
  },
  {
    type: "text",
    value_en:
      "Nebulae are generally grouped into four major classes. Most belong to the diffuse nebula category, meaning they have no sharply defined boundaries. Based on how they behave in visible light, they can be divided further into emission nebulae and reflection nebulae.",
  },
  {
    type: "heading",
    value_en: "What Is a Nebula Made Of?",
    level: 2,
  },
  {
    type: "text",
    value_en:
      "Nebulae are known for their beautiful and intricate patterns, and those patterns are made from different forms of interstellar matter. These clouds are composed primarily of gas, dust, and plasma, all leftovers of stellar processes such as hydrogen fusion inside stars, stellar winds, and supernova explosions.",
  },
  {
    type: "text",
    value_en:
      "The composition of a nebula can vary widely depending on its age, location, and physical conditions. Some are dominated by hydrogen, while others contain significant amounts of helium, carbon, nitrogen, and oxygen. The gas and dust in nebulae can also be ionized, meaning atoms have lost or gained electrons. That ionization causes light to be emitted at different wavelengths, producing the characteristic colors and patterns we observe. Overall, nebulae are a fascinating subject for astronomers and astrophysicists because they offer important clues about the history and evolution of the universe.",
  },
  {
    type: "heading",
    value_en: "Why Do Nebulae Form?",
    level: 2,
  },
  {
    type: "text",
    value_en:
      "Basically, a nebula forms when parts of interstellar matter undergo gravitational collapse. Mutual gravitational attraction pulls material together in space and creates dense regions. Stars can begin forming in the centers of those collapsing clouds. Ultraviolet ionizing radiation makes the gas around these stars visible at optical wavelengths, the light our eyes can detect. Some of these structures can stretch hundreds of light-years across.",
  },
  {
    type: "text",
    value_en:
      "The universe is not empty. Outer space contains the interstellar medium, or ISM, which is made mainly of gas and dust. About 99 percent of the ISM is gas, and roughly 75 percent of its mass is hydrogen while the remaining 25 percent is helium. Interstellar gas includes neutral atoms and molecules as well as charged particles such as ions and electrons. Its average density is only about one atom per cubic centimeter, which is extremely thin. Even so, across the enormous distances between stars, the total amount of matter adds up. Eventually, with enough gravitational attraction inside a cloud, that material can gather together and continue collapsing.",
  },
  {
    type: "image",
    url: nebulaImage("Nebula Study 03"),
  },
  {
    type: "heading",
    value_en: "The Four Main Types of Nebulae",
    level: 2,
  },
  {
    type: "heading",
    value_en: "1. Emission Nebula",
    level: 3,
  },
  {
    type: "text",
    value_en:
      "Also known as stellar nurseries, these huge concentrations of hydrogen gas are pulled together by gravity into astonishing structures such as the Pillars of Creation inside the Eagle Nebula.",
  },
  {
    type: "text",
    value_en:
      "In these star-forming regions, gas, dust, and other matter gather into dense zones. As density increases, the region becomes hot enough to form stars. The leftover material is then believed to form planets and other planetary-system objects. Emission nebulae radiate light from ionized gas and are often called H II regions because they are largely made of ionized hydrogen. The Orion Nebula is a classic emission nebula and star-forming region.",
  },
  {
    type: "image",
    url: nebulaImage("Nebula Study 04"),
    caption_en:
      "The Orion Nebula is a perfect example of a star-forming region, or stellar nursery.",
  },
  {
    type: "text",
    value_en:
      "It is not only one of the brightest nebulae in our sky, it is also one of the most active star-forming regions in our galaxy. It can be observed in close detail even with a small telescope. It spans an area about twice the diameter of the full Moon. As gravity continues to pull material together, the region becomes hot enough to form new stars. In the same way our solar system formed, the remaining material may become planets orbiting those stars.",
  },
  {
    type: "text",
    value_en:
      "The Orion Nebula is an emission nebula and a star-forming region. It is one of the most active stellar nurseries in our galaxy and can be observed easily through a small telescope.",
  },
  {
    type: "heading",
    value_en: "2. Planetary Nebula",
    level: 3,
  },
  {
    type: "text",
    value_en:
      "When early astronomers observed these round, compact nebulae in the night sky, they thought they must be planets. In reality, planetary nebulae have nothing to do with planets.",
  },
  {
    type: "text",
    value_en:
      "A planetary nebula forms when a star dies and creates dramatic glowing structures of cosmic gas. Famous examples in the night sky include the Ring Nebula, the Dumbbell Nebula, and the Helix Nebula.",
  },
  {
    type: "text",
    value_en:
      "A planetary nebula marks the final stage in the life of a low-mass star. This is called the red giant phase, when the star slowly sheds its outer layers because of helium flashes in its interior. As the star loses enough material, its temperature rises. The ultraviolet radiation it emits then ionizes the surrounding material that has been cast off.",
  },
  {
    type: "image",
    url: nebulaImage("Nebula Study 05"),
    caption_en:
      "The Dumbbell Nebula photographed using a camera and telescope.",
  },
  {
    type: "heading",
    value_en: "3. Supernova Remnant",
    level: 3,
  },
  {
    type: "text",
    value_en:
      "A supernova remnant is the aftermath of a cosmic explosion that has scattered material from a star across a vast region of space. Those remains form a nebula and create some of the most astonishing structures in the universe.",
  },
  {
    type: "text",
    value_en:
      "Some nebulae are formed by supernova explosions and are therefore classified as supernova remnants. In such cases, short-lived stars explode in their cores and blow away their outer layers.",
  },
  {
    type: "image",
    url: nebulaImage("Nebula Study 06"),
    caption_en: "The Eastern Veil Nebula is a supernova remnant.",
  },
  {
    type: "text",
    value_en:
      "This kind of explosion leaves behind a compact object, such as a neutron star, along with clouds of gas and dust ionized by the energy of the blast. The Veil Nebula is a prime example of a supernova remnant, as seen in this image captured from a backyard with a small telescope. The Veil Nebula contains several filamentary structures, including Pickering's Triangle.",
  },
  {
    type: "heading",
    value_en: "4. Dark Nebula",
    level: 3,
  },
  {
    type: "text",
    value_en:
      "A dark nebula is a cloud of gas and dust revealed because it blocks the bright stellar regions behind it. Against a luminous background, these nebulae appear as striking silhouettes with beautiful shapes and structures.",
  },
  {
    type: "text",
    value_en:
      "Opaque clouds known as dark nebulae do not emit visible radiation and are not illuminated by stars, but they block the light of bright objects behind them. Like emission and reflection nebulae, dark nebulae are also sources of infrared emission, mainly because of the dust they contain.",
  },
  {
    type: "text",
    value_en:
      "Examples of dark nebulae include the Coalsack Nebula and the Horsehead Nebula. This kind of nebula is made of dense dust clouds that block the bright emission gas behind them. Some deep-sky objects combine different kinds of nebula in a single system. A leading example is the Trifid Nebula, which contains an emission nebula, a reflection nebula, and a dark nebula all at once. It is a perfect example of a complex combination nebula.",
  },
  {
    type: "image",
    url: nebulaImage("Nebula Study 07"),
    caption_en:
      "The Horsehead Nebula is probably one of the most iconic dark nebulae in the night sky.",
  },
  {
    type: "text",
    value_en:
      "With their mesmerizing colors and intricate structures, nebulae capture our imagination and push the boundaries of our knowledge of the universe. They remind us of the vastness and interconnected nature of the cosmos. Whenever we look up at the night sky, the splendor of nebulae sparks curiosity and fuels the desire to explore. In their ever-changing forms, they invite us into an endless journey of discovery and wonder beyond imagination.",
  },
];

const moonFormationBlocks: ThunderbitTranslationBlock[] = [
  {
    type: "text",
    value_en:
      "I am sure that, like me, at least a small fraction of people have spent long stretches staring in awe at the Moon on a luminous night while listening to the distant hum of highway traffic or the quiet rhythm of the evening. Just thinking about it creates an irresistible sense of wonder: beyond Earth, a beautiful object sits proudly in the darkness as a source of light. But how did this graceful Moon come into being? Many people say it formed after a collision between Earth and another celestial body. But is that really the full story?",
  },
  {
    type: "text",
    value_en:
      "There are many theories about the Moon's origin, both impact-based and non-impact. The capture theory says Earth's strong gravity pulled in a rocky body that formed elsewhere in the Solar System and trapped it in orbit, creating what we now know as Luna, Earth's moon. However, bodies captured this way are often irregular in shape rather than round like the Moon.",
  },
  {
    type: "heading",
    value_en: "Figure: Capture Theory",
    level: 3,
  },
  {
    type: "text",
    value_en:
      "According to the fission theory, Earth was once spinning so fast that some of its material broke away, became the Moon, and began orbiting the planet. But if the Moon had formed elsewhere and was later captured by Earth's gravity, its composition should be very different from Earth's. In reality, the Earth and Moon are quite similar in composition. Likewise, if the Moon formed at the same time as Earth, or split away from it, its mineral types and ratios should closely match Earth's. They are indeed very similar, but not perfectly identical. That is why the most widely accepted explanation today is the Giant Impact theory.",
  },
  {
    type: "heading",
    value_en: "Figure: Fission Theory",
    level: 3,
  },
  {
    type: "text",
    value_en:
      "Before the Earth-Moon system existed, there may have been a proto-Earth and a roughly Mars-sized planet called Theia. According to the Giant Impact theory, Theia collided with Earth and blasted vaporized material from Earth's crust into space. Gravity then pulled the debris together to form a moon that is proportionally one of the largest in the Solar System relative to its host planet.",
  },
  {
    type: "heading",
    value_en: "Figure: Giant Impact",
    level: 3,
  },
  {
    type: "text",
    value_en:
      "This model explains why the Moon is made mostly of lighter material and is less dense than Earth. The material that formed it likely came from Earth's crust, while the rocky core remained largely untouched. Because the debris collected around the remains of Theia's core, it would have concentrated near Earth's orbital plane. That is one reason the Moon travels along a path similar to the one the Sun appears to follow across our sky.",
  },
  {
    type: "text",
    value_en:
      "Although this is the most popular theory, it also has challenges. Most models suggest that more than 60 percent of the Moon should be made of material from Theia. But rock samples brought back by the Apollo missions suggest otherwise.",
  },
  {
    type: "heading",
    value_en: "Figure: Lunar Rock",
    level: 3,
  },
  {
    type: "text",
    value_en:
      "According to astrophysicist Alessandra Mastrobuono-Battisti of the Israel Institute of Technology in Haifa, apart from a few compositional differences, the Earth and Moon are almost twins. This finding casts a long shadow over simple Giant Impact models. In 2017, Israeli researchers proposed an alternative impact scenario suggesting that the Moon could be the result of many small collisions. In this picture, each collision creates a debris disk around the proto-Earth, which then forms a moonlet. Those moonlets migrate outward tidally and later merge into the Moon. Such sub-lunar moonlets could have been a common result of impacts on the proto-Earth in the early Solar System. Their efficient merger after multiple impacts may explain why Earth and the Moon ended up with such similar compositions.",
  },
  {
    type: "heading",
    value_en: "Figure: Multiple Impact Theory",
    level: 3,
  },
  {
    type: "text",
    value_en:
      "There is another possibility called the co-formation theory. In 2012, Robin Canup of the Southwest Research Institute in Texas proposed that Earth and the Moon formed at the same time, when two enormous bodies about five times the size of Mars crashed into each other. As NASA explained, after the collision the two similar-sized bodies collided again and formed a proto-Earth surrounded by a disk from which the Moon emerged.",
  },
  {
    type: "heading",
    value_en: "Figure: Co-formation (Before Collision, During the Formation of Earth)",
    level: 3,
  },
  {
    type: "text",
    value_en:
      "However, research published in Nature Geoscience in 2020 offered another explanation for why Earth and the Moon have such similar compositions. After studying oxygen isotopes in lunar rocks brought back by Apollo astronauts, researchers found a small but important difference compared with Earth's rocks. Samples collected from the deep lunar mantle were much heavier than comparable Earth samples, and their isotopic signatures seemed more representative of Theia, the proto-lunar impactor. This evidence again supports the Giant Impact theory, though it still cannot be considered fully proven because the samples came from only one region of the Moon.",
  },
  {
    type: "text",
    value_en:
      "Many of these theories assume that the Moon formed gradually over months or years as material merged in orbit. But a newer simulation suggests a different possibility: the Moon may have formed almost immediately, within just a few hours, when material from Earth and Theia was launched directly into orbit after the impact. This rapid, single-stage formation model may also help answer other unresolved questions. It could place the Moon in a wide orbit with an interior that was not completely molten, potentially explaining features such as the Moon's tilted orbit and thin crust. It is one of the most intriguing explanations for the Moon's origin.",
  },
  {
    type: "text",
    value_en:
      "So it is clear that the mystery of the Moon's origin is far from settled. Many secrets about our round companion are still hidden. Yet with the rapid advance of science and technology, there is good reason to hope that we will uncover many more answers soon. NASA's upcoming Artemis missions are moving in exactly that direction. To get closer to knowing which theory is correct, scientists will need future lunar samples returned to Earth for study. As researchers gain access to material from other parts of the Moon and from deeper beneath its surface, they will be able to compare real-world data with these simulated scenarios. Whatever the final answer is, the Moon once again reminds us that the universe is a workshop of endless mysteries.",
  },
];

export const thunderbitBlogSeedTranslations: ThunderbitBlogSeedTranslation[] = [
  {
    fileName: "Thunderbit_193804_20260429_114922.json",
    title_en: "Kalpana Chawla: The Astronaut Lost to Space",
    slug: "kalpana-chawla-the-astronaut-lost-to-space",
    category: "Space",
    tags: ["biography", "nasa", "spaceflight", "astronaut"],
    blocks: kalpanaChawlaBlocks,
  },
  {
    fileName: "Thunderbit_193804_20260429_115146.json",
    title_en: "Exploring the Mystery of Nebulae: A Cosmic Wonder",
    slug: "exploring-the-mystery-of-nebulae-a-cosmic-wonder",
    category: "Space",
    tags: ["nebula", "astronomy", "deep-sky", "stargazing"],
    blocks: nebulaBlocks,
  },
  {
    fileName: "Thunderbit_193804_20260429_115353.json",
    title_en: "How Did the Moon Form?",
    slug: "how-did-the-moon-form",
    category: "Space",
    tags: ["moon", "planetary-science", "giant-impact", "artemis"],
    blocks: moonFormationBlocks,
  },
];
