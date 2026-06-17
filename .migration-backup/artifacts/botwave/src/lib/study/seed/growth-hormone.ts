/**
 * GROWTH HORMONE - Pre-loaded Study Material
 * Source: Growth Hormone PPT (13 slides)
 */

export const growthHormoneMaterial = {
  title: 'Growth Hormone',
  fileType: 'ppt',
  wordCount: 800,
  status: 'analyzed' as const,

  summary: {
    definitions: [
      { term: 'Growth Hormone (GH)', definition: 'Also called somatotropin. A peptide hormone with 191 amino acids secreted by somatotrophs of the anterior pituitary. Secreted in pulsatile fashion. Essential for growth and development. Affects most tissues of the body.' },
      { term: 'IGF-I (Insulin-like Growth Factor I)', definition: 'Also called Somatomedin C. A serum factor produced primarily in the liver that mediates most of the growth-promoting effects of GH. Also secreted by other tissues such as bone. GH exerts its actions mainly through IGF-I.' },
      { term: 'Somatotrophs', definition: 'The specific cells of the anterior pituitary that secrete Growth Hormone. They comprise about 50% of the hormone-producing cells of the anterior pituitary.' },
      { term: 'Dwarfism', definition: 'Short stature resulting from GH hyposecretion in children. Causes include: lack of GH, lack of GH receptors (e.g., African Pygmies), or GH Insensitive Syndrome (Laron dwarfism). Features: short stature, micropenis, hypoglycaemia.' },
      { term: 'Laron Dwarfism (GH Insensitive Syndrome)', definition: 'A form of dwarfism caused by defective GH receptors. Despite normal or elevated GH levels, the body cannot respond to GH. IGF-I levels are low. Named after Zvi Laron who described it.' },
      { term: 'Acromegaly', definition: 'Clinical condition due to excess GH in ADULTS. Because epiphyses are already closed, growth occurs in areas where cartilage persists. Features: thick lips, macroglossia, broad nose, prominent eyebrows, prognathism, thickened skin, coarse facial features, acral part abnormalities.' },
      { term: 'Gigantism', definition: 'Clinical condition due to excess GH in GROWING CHILDREN (before epiphyseal closure). Features: abnormal height (7-8 ft), large hands and feet, coarse facial features, thick lips, macroglossia, bilateral gynaecomastia, loss of libido/impotence.' },
      { term: 'Prognathism', definition: 'Protrusion of the lower jaw due to elongation and widening of the mandible. A characteristic feature of acromegaly, associated with increased spacing of the teeth.' },
      { term: 'Macroglossia', definition: 'Abnormal enlargement of the tongue. Seen in both acromegaly and gigantism due to excessive GH stimulating tissue growth.' },
      { term: 'Anti-insulin Effects', definition: 'GH opposes the action of insulin on glucose metabolism. GH promotes hyperglycaemia by reducing glucose uptake in tissues and increasing hepatic glucose output. This is the "diabetogenic" effect of GH.' },
    ],

    keyPoints: [
      '## GROWTH HORMONE (GH)',
      '>> GH (somatotropin) is a 191 amino acid peptide secreted by somatotrophs of the anterior pituitary. It acts mainly through IGF-I and is essential for growth, metabolism, and tissue repair.',
      '### Definition',
      'Also called somatotropin - a peptide hormone essential for growth, metabolism, and tissue repair',
      '### Basic Properties',
      'Secreted by somatotrophs of the anterior pituitary (50% of pituitary hormone-producing cells)',
      '191 amino acids, secreted in pulsatile fashion',
      'Acts mainly through IGF-I (Somatomedin C), produced by the liver and other tissues',
      'GH induces precursor cells to differentiate and secrete local IGF-I → stimulates cell division',
      '### Functions/Effects',
      '1) Promotes LINEAR GROWTH - effects on bone, cartilage, connective tissue',
      '2) Stimulates protein synthesis (muscle, bone, cartilage)',
      '3) ANTI-INSULIN effects - opposes insulin on glucose metabolism (diabetogenic)',
      '4) Supports tissue repair',
      '### Regulation',
      'Stimulators: GHRH, sleep, exercise, insulin, hypoglycaemia',
      'Inhibitors: Somatostatin (GHIH), aging, obesity, exogenous GH, ↑blood glucose, ↑free fatty acids',
      '### Abnormalities',
      'Hyposecretion in children → Dwarfism. Types: 1) Lack of GH, 2) Lack of GH receptors (e.g. African Pygmies), 3) GH Insensitive Syndrome (Laron dwarfism - defective GH receptors)',
      'Hypersecretion in ADULTS → Acromegaly (epiphyses closed → only cartilage grows)',
      'Hypersecretion in CHILDREN → Gigantism (epiphyses open → linear bone growth)',
      '### Clinical Features',
      'Dwarfism: short stature, micropenis, hypoglycaemia',
      'Acromegaly: thick lips, macroglossia, broad nose, prominent eyebrows, prognathism, thickened skin, coarse facial features',
      'Gigantism: abnormal height (7-8 ft), large hands/feet, coarse features, bilateral gynaecomastia',
      '### Diagnosis',
      'Acromegaly: elevated IGF-I + failure of GH suppression on OGTT (gold standard)',
      'Dwarfism: GH stimulation tests, low IGF-I levels',
      '### Treatment',
      'Dwarfism: Human GH (hGH) replacement (NOT effective in Laron - must use IGF-I/mecasermin)',
      'Acromegaly: transsphenoidal surgery, somatostatin analogues (octreotide), GH receptor antagonist (pegvisomant)',
    ],

    examHighlights: [
      '## GROWTH HORMONE - EXAM FACTS',
      '>> These GH concepts are the most commonly tested in physiology exams.',
      '### Mechanism',
      'GH acts through IGF-I (Somatomedin C) from the liver - IGF-I is the mediator, not GH directly',
      'GH has ANTI-INSULIN effects - GH is diabetogenic (favourite exam question)',
      '### Key Distinctions',
      'Acromegaly = ADULTS (closed epiphyses → cartilage growth only). Gigantism = CHILDREN (open epiphyses → tall stature)',
      'Laron dwarfism = defective GH receptors. GH levels NORMAL/HIGH, IGF-I LOW. Treat with IGF-I, NOT hGH',
      '### Clinical Clues',
      'Prognathism (protruding jaw) = hallmark of acromegaly',
      'GH stimulated by HYPOGLYCAEMIA, inhibited by HYPERGLYCAEMIA',
      'Sleep and exercise are natural GH stimulators',
      'GH ↓ with aging and obesity',
    ],

    clinicalCorrelations: [
      '## GH EXCESS DISORDERS',
      '>> Excess GH causes acromegaly in adults and gigantism in children. Both are usually caused by pituitary adenomas.',
      '### Acromegaly (Adults)',
      'Cause: GH-secreting pituitary adenoma',
      'Diagnosis: elevated IGF-I + failure of GH suppression on OGTT',
      'Treatment: transsphenoidal surgery, somatostatin analogues (octreotide), GH receptor antagonist (pegvisomant)',
      '### Gigantism (Children)',
      'Same pathology as acromegaly but before epiphyseal closure',
      'Robert Wadlow (8\'11") is the most famous case',
      '## GH DEFICIENCY DISORDERS',
      '>> GH deficiency in children causes dwarfism. Laron dwarfism is a special case where GH receptors are defective.',
      '### GH Deficiency in Children',
      'Features: short stature, delayed puberty, hypoglycaemia',
      'Diagnosis: GH stimulation tests',
      'Treatment: recombinant human GH (hGH) injections',
      '### Laron Dwarfism',
      'GH receptor mutation → high GH but low IGF-I',
      'hGH treatment is INEFFECTIVE - must use recombinant IGF-I (mecasermin)',
      '### GH & Diabetes',
      'Chronic GH excess → insulin resistance → secondary diabetes mellitus',
      '### GH & Sleep',
      'GH peaks during slow-wave sleep (Stage 3/4 NREM). Sleep deprivation ↓ GH → impairs growth in children',
    ],

    processes: [
      {
        name: 'GH-IGF-I Axis',
        steps: [
          'Hypothalamus releases GHRH (stimulatory) or Somatostatin (inhibitory)',
          'GHRH stimulates somatotrophs in anterior pituitary to secrete GH',
          'GH enters systemic circulation',
          'GH acts on liver → produces IGF-I (Somatomedin C)',
          'IGF-I enters circulation and mediates growth effects on bone, cartilage, muscle',
          'IGF-I (and GH) feed back to hypothalamus and pituitary to inhibit further GH release (negative feedback)',
        ],
      },
      {
        name: 'GH Effects on Growth',
        steps: [
          'GH induces precursor cells in bone and tissues to differentiate',
          'Differentiated cells secrete local IGF-I which stimulates cell division',
          'In bone: epiphyseal plate chondrocytes proliferate (linear growth in children)',
          'In muscle: increased protein synthesis and muscle mass',
          'In cartilage: stimulates growth in areas where cartilage persists',
          'Net result: linear growth (children) or acral growth (adults with excess GH)',
        ],
      },
    ],

    mnemonics: [
      { topic: 'GH Stimulators', mnemonic: 'GHISH: GHRH, Hypoglycaemia, Insulin, Sleep, Harder exercise', explanation: 'GH is stimulated by GHRH, hypoglycaemia, insulin, sleep, and exercise. These are the main physiological stimulators.' },
      { topic: 'GH Inhibitors', mnemonic: 'SAGE-FO: Somatostatin, Aging, Glucose (high), Exogenous GH, Fatty acids (free), Obesity', explanation: 'GH is inhibited by somatostatin, aging, hyperglycaemia, exogenous GH administration, free fatty acids, and obesity.' },
      { topic: 'Acromegaly vs Gigantism', mnemonic: 'Acro = Adults (Closed bones). Giga = Growing (Open bones)', explanation: 'Acromegaly occurs in adults with closed epiphyses. Gigantism occurs in growing children with open epiphyses.' },
    ],

    quickReview: [
      'GH = 191 aa peptide from somatotrophs. Acts through IGF-I (from liver). Pulsatile secretion.',
      'Effects: linear growth, protein synthesis, anti-insulin (diabetogenic), tissue repair.',
      'Stimulated by: GHRH, sleep, exercise, hypoglycaemia. Inhibited by: somatostatin, aging, obesity, hyperglycaemia.',
      'Hyposecretion in children = Dwarfism (treat with hGH). Laron dwarfism = GH receptor defect (treat with IGF-I, not hGH).',
      'Hypersecretion: Adults = Acromegaly (prognathism, macroglossia, acral growth). Children = Gigantism (7-8 ft tall).',
    ],
  },

  questions: [
    // LIKELIHOOD / MOST LIKELY
    { questionType: 'mcq', question: 'A 45-year-old man presents with coarsening of facial features, increasing ring size, and jaw protrusion over the past 5 years. The MOST LIKELY diagnosis is:', options: ['A) Gigantism', 'B) Acromegaly', 'C) Cushing\'s syndrome', 'D) Hypothyroidism'], correctAnswer: 'B) Acromegaly', explanation: 'Acromegaly occurs in adults (closed epiphyses) with gradual coarsening of features, prognathism (jaw protrusion), increased ring/shoe size (acral growth). Gigantism only occurs in children before epiphyseal closure.', difficulty: 'medium' },
    { questionType: 'mcq', question: 'A child with short stature has elevated GH levels but low IGF-I. The MOST LIKELY diagnosis is:', options: ['A) GH deficiency', 'B) Pituitary dwarfism', 'C) Laron dwarfism (GH insensitive syndrome)', 'D) Hypothyroidism'], correctAnswer: 'C) Laron dwarfism (GH insensitive syndrome)', explanation: 'Laron dwarfism is caused by defective GH receptors. GH is produced normally (even elevated) but cannot act, so IGF-I production is low. Treatment requires IGF-I replacement, not hGH.', difficulty: 'hard' },
    { questionType: 'mcq', question: 'Which stimulus is MOST LIKELY to increase GH secretion?', options: ['A) High blood glucose', 'B) Obesity', 'C) Deep sleep', 'D) Aging'], correctAnswer: 'C) Deep sleep', explanation: 'GH secretion peaks during deep sleep (slow-wave/Stage 3-4 NREM). High blood glucose, obesity, and aging all INHIBIT GH secretion.', difficulty: 'easy' },
    { questionType: 'mcq', question: 'A patient with acromegaly is MOST LIKELY to also develop:', options: ['A) Hypoglycaemia', 'B) Secondary diabetes mellitus', 'C) Hypothermia', 'D) Adrenal insufficiency'], correctAnswer: 'B) Secondary diabetes mellitus', explanation: 'GH has anti-insulin effects. Chronic GH excess in acromegaly causes insulin resistance, which can lead to impaired glucose tolerance and secondary diabetes mellitus.', difficulty: 'medium' },
    { questionType: 'mcq', question: 'The MOST LIKELY mediator of GH\'s growth-promoting effects is:', options: ['A) Somatostatin', 'B) Somatocrinin', 'C) IGF-I (Somatomedin C)', 'D) Insulin'], correctAnswer: 'C) IGF-I (Somatomedin C)', explanation: 'GH exerts most of its growth-promoting effects through IGF-I (also called Somatomedin C), which is produced primarily in the liver and stimulates cell division in bone, cartilage, and muscle.', difficulty: 'easy' },
    { questionType: 'mcq', question: 'The BEST confirmatory test for acromegaly is:', options: ['A) Random GH level', 'B) Failure of GH suppression during OGTT', 'C) IGF-II level', 'D) TRH stimulation test'], correctAnswer: 'B) Failure of GH suppression during OGTT', explanation: 'In normal individuals, oral glucose load suppresses GH. In acromegaly, GH is NOT suppressed during the Oral Glucose Tolerance Test (OGTT) - this is the gold standard confirmatory test.', difficulty: 'hard' },
    { questionType: 'mcq', question: 'Treatment with recombinant human GH would be LEAST effective in:', options: ['A) GH-deficient dwarfism', 'B) Laron dwarfism', 'C) Idiopathic short stature', 'D) Turner syndrome'], correctAnswer: 'B) Laron dwarfism', explanation: 'Laron dwarfism has defective GH receptors, so exogenous hGH cannot work. These patients need recombinant IGF-I (mecasermin) instead. All others can benefit from hGH to varying degrees.', difficulty: 'hard' },

    // STANDARD MCQs
    { questionType: 'mcq', question: 'Growth Hormone contains how many amino acids?', options: ['A) 39', 'B) 51', 'C) 191', 'D) 199'], correctAnswer: 'C) 191', explanation: 'GH has 191 amino acids. For comparison: ACTH = 39 aa, Insulin = 51 aa, Prolactin = 199 aa.', difficulty: 'easy' },
    { questionType: 'mcq', question: 'GH is secreted in which pattern?', options: ['A) Continuous steady release', 'B) Pulsatile fashion', 'C) Only during waking hours', 'D) Only during meals'], correctAnswer: 'B) Pulsatile fashion', explanation: 'GH is secreted in a pulsatile fashion with the largest pulse occurring during deep sleep. It is not continuous or restricted to waking hours.', difficulty: 'easy' },
    { questionType: 'mcq', question: 'IGF-I is primarily produced in the:', options: ['A) Kidney', 'B) Liver', 'C) Bone marrow', 'D) Adrenal gland'], correctAnswer: 'B) Liver', explanation: 'IGF-I (Somatomedin C) is primarily produced by the liver in response to GH. It is also produced locally by other tissues such as bone.', difficulty: 'easy' },
    { questionType: 'mcq', question: 'All of the following stimulate GH secretion EXCEPT:', options: ['A) GHRH', 'B) Sleep', 'C) Exercise', 'D) Hyperglycaemia'], correctAnswer: 'D) Hyperglycaemia', explanation: 'GH is stimulated by GHRH, sleep, exercise, insulin, and hypoglycaemia. Hyperglycaemia (high blood glucose) INHIBITS GH secretion.', difficulty: 'easy' },
    { questionType: 'mcq', question: 'Which feature is characteristic of acromegaly but NOT gigantism?', options: ['A) Large hands and feet', 'B) Prognathism with increased tooth spacing', 'C) Abnormal height of 7-8 feet', 'D) Macroglossia'], correctAnswer: 'C) Abnormal height of 7-8 feet', explanation: 'Abnormal height (7-8 ft) is characteristic of GIGANTISM (open epiphyses, linear growth). Acromegaly occurs after epiphyseal closure so height doesn\'t increase - instead there is acral and soft tissue enlargement.', difficulty: 'medium' },
    { questionType: 'mcq', question: 'GH hyposecretion in adults causes:', options: ['A) Dwarfism', 'B) Gigantism', 'C) Acromegaly', 'D) Not very significant effects'], correctAnswer: 'D) Not very significant effects', explanation: 'GH hyposecretion in adults is "not very significant" because adult growth is already complete. It may cause some increase in body fat and decrease in muscle mass, but no major clinical syndrome.', difficulty: 'easy' },
    { questionType: 'mcq', question: 'The "anti-insulin effects" of GH include:', options: ['A) Increased glucose uptake by muscles', 'B) Stimulation of lipogenesis', 'C) Promotion of hyperglycaemia', 'D) Stimulation of glycogenesis'], correctAnswer: 'C) Promotion of hyperglycaemia', explanation: 'GH\'s anti-insulin effects promote hyperglycaemia by reducing tissue glucose uptake and increasing hepatic glucose output. This is why chronic GH excess (acromegaly) can cause diabetes.', difficulty: 'medium' },
    { questionType: 'mcq', question: 'Which cells secrete Growth Hormone?', options: ['A) Thyrotrophs', 'B) Corticotrophs', 'C) Somatotrophs', 'D) Lactotrophs'], correctAnswer: 'C) Somatotrophs', explanation: 'Somatotrophs are the GH-secreting cells of the anterior pituitary. Thyrotrophs secrete TSH, corticotrophs secrete ACTH, and lactotrophs secrete prolactin.', difficulty: 'easy' },
    { questionType: 'mcq', question: 'African Pygmies have short stature due to:', options: ['A) GH deficiency', 'B) IGF-I excess', 'C) Lack of GH receptors', 'D) Somatostatin excess'], correctAnswer: 'C) Lack of GH receptors', explanation: 'African Pygmies have a form of dwarfism caused by lack of GH receptors. GH is produced normally but cannot bind and exert its effects, similar in mechanism to Laron dwarfism.', difficulty: 'medium' },
    { questionType: 'mcq', question: 'Which feature is common to BOTH acromegaly and gigantism?', options: ['A) Normal height', 'B) Macroglossia', 'C) Micropenis', 'D) Hypoglycaemia'], correctAnswer: 'B) Macroglossia', explanation: 'Macroglossia (enlarged tongue) occurs in both acromegaly and gigantism due to excess GH stimulating soft tissue growth. Micropenis and hypoglycaemia are features of GH DEFICIENCY, not excess.', difficulty: 'medium' },
    { questionType: 'mcq', question: 'Free fatty acids in the blood cause GH to:', options: ['A) Increase', 'B) Decrease', 'C) Remain unchanged', 'D) Become pulsatile'], correctAnswer: 'B) Decrease', explanation: 'Increased free fatty acids in the blood INHIBIT GH secretion. This is part of the metabolic feedback that regulates GH - when energy substrates are abundant, GH is suppressed.', difficulty: 'medium' },
    { questionType: 'mcq', question: 'Bilateral gynaecomastia is a feature of:', options: ['A) Acromegaly only', 'B) Gigantism only', 'C) Both acromegaly and gigantism', 'D) Dwarfism'], correctAnswer: 'B) Gigantism only', explanation: 'Bilateral gynaecomastia (breast enlargement) is listed specifically as a feature of gigantism, not acromegaly. It is related to the hormonal imbalance in growing children with excess GH.', difficulty: 'hard' },
    { questionType: 'mcq', question: 'A somatostatin analogue (octreotide) used in acromegaly works by:', options: ['A) Stimulating GH production', 'B) Blocking GH receptors', 'C) Inhibiting GH release from pituitary', 'D) Increasing IGF-I breakdown'], correctAnswer: 'C) Inhibiting GH release from pituitary', explanation: 'Octreotide mimics somatostatin and inhibits GH secretion from the anterior pituitary. It is used when surgery for acromegaly is not curative or not possible.', difficulty: 'medium' },
    { questionType: 'mcq', question: 'GH promotes growth primarily by its effects on:', options: ['A) Liver only', 'B) Bone, cartilage, and connective tissues', 'C) Kidneys and lungs', 'D) Brain and spinal cord'], correctAnswer: 'B) Bone, cartilage, and connective tissues', explanation: 'GH promotes linear growth by its effects on bone, cartilage, and other connective tissues. It induces precursor cells to differentiate and secrete IGF-I locally.', difficulty: 'easy' },

    // TRUE/FALSE
    { questionType: 'true_false', question: 'GH acts directly on target tissues without any mediator. True or False?', options: ['True', 'False'], correctAnswer: 'False', explanation: 'GH exerts most of its growth-promoting effects INDIRECTLY through IGF-I (Somatomedin C), produced primarily by the liver. GH does have some direct effects (anti-insulin, lipolysis), but growth is mainly IGF-I mediated.', difficulty: 'easy' },
    { questionType: 'true_false', question: 'Acromegaly occurs in children before epiphyseal closure. True or False?', options: ['True', 'False'], correctAnswer: 'False', explanation: 'Acromegaly occurs in ADULTS after epiphyseal closure. In children before closure, excess GH causes GIGANTISM with increased linear height.', difficulty: 'easy' },
    { questionType: 'true_false', question: 'Hypoglycaemia stimulates GH secretion. True or False?', options: ['True', 'False'], correctAnswer: 'True', explanation: 'Hypoglycaemia is one of the stimulators of GH secretion. This makes physiological sense as GH has anti-insulin (glucose-sparing) effects that help counteract low blood sugar.', difficulty: 'easy' },
    { questionType: 'true_false', question: 'Exogenous GH administration stimulates endogenous GH release. True or False?', options: ['True', 'False'], correctAnswer: 'False', explanation: 'Exogenous GH INHIBITS endogenous GH release through negative feedback. Giving GH from outside the body signals that there is enough GH, suppressing further production.', difficulty: 'medium' },
    { questionType: 'true_false', question: 'Laron dwarfism can be effectively treated with human GH injections. True or False?', options: ['True', 'False'], correctAnswer: 'False', explanation: 'Laron dwarfism is caused by defective GH receptors, so hGH cannot work regardless of the dose. Treatment requires recombinant IGF-I (mecasermin) which bypasses the GH receptor.', difficulty: 'medium' },
    { questionType: 'true_false', question: 'GH secretion increases with obesity. True or False?', options: ['True', 'False'], correctAnswer: 'False', explanation: 'Obesity INHIBITS GH secretion. Obese individuals have lower GH levels, which may contribute to difficulty losing weight as GH promotes lipolysis.', difficulty: 'easy' },

    // FILL IN THE BLANK
    { questionType: 'fill_blank', question: 'GH excess in adults causes _____ while GH excess in children causes _____.', options: [], correctAnswer: 'Acromegaly; Gigantism', explanation: 'Acromegaly occurs in adults (closed epiphyses → acral/soft tissue growth). Gigantism occurs in children (open epiphyses → linear bone growth → tall stature).', difficulty: 'easy' },
    { questionType: 'fill_blank', question: 'The serum factor produced by the liver that mediates GH effects is called _____ or Somatomedin C.', options: [], correctAnswer: 'IGF-I (Insulin-like Growth Factor I)', explanation: 'IGF-I, also known as Somatomedin C, is produced by the liver in response to GH and mediates most of GH\'s growth-promoting effects on bone, cartilage, and muscle.', difficulty: 'easy' },
    { questionType: 'fill_blank', question: 'Protrusion of the lower jaw in acromegaly is called _____.', options: [], correctAnswer: 'Prognathism', explanation: 'Prognathism is the protrusion of the lower jaw due to elongation and widening of the mandible, a hallmark feature of acromegaly. It is associated with increased spacing of the teeth.', difficulty: 'medium' },
    { questionType: 'fill_blank', question: 'GH is secreted by cells called _____ in the anterior pituitary.', options: [], correctAnswer: 'Somatotrophs', explanation: 'Somatotrophs are the GH-secreting cells, making up about 50% of hormone-producing cells of the anterior pituitary.', difficulty: 'medium' },

    // CLINICAL SCENARIOS
    { questionType: 'mcq', question: 'A 10-year-old child is growing much faster than peers, currently at 6\'2". GH levels are elevated. What is the MOST LIKELY underlying cause?', options: ['A) Constitutional tall stature', 'B) GH-secreting pituitary adenoma', 'C) Exogenous GH administration', 'D) Precocious puberty'], correctAnswer: 'B) GH-secreting pituitary adenoma', explanation: 'In a child with documented elevated GH and excessive growth rate, a GH-secreting pituitary adenoma is the most likely cause of gigantism. Constitutional tall stature would have normal GH levels.', difficulty: 'medium' },
    { questionType: 'mcq', question: 'A patient with acromegaly undergoes an OGTT. GH level at 2 hours is 8 ng/mL (normal suppression is <1 ng/mL). This confirms:', options: ['A) Normal GH regulation', 'B) GH is appropriately suppressed', 'C) Autonomous GH secretion (acromegaly confirmed)', 'D) GH deficiency'], correctAnswer: 'C) Autonomous GH secretion (acromegaly confirmed)', explanation: 'In acromegaly, GH is secreted autonomously from a pituitary adenoma and cannot be suppressed by glucose. Normal GH should suppress to <1 ng/mL during OGTT. Failure to suppress confirms the diagnosis.', difficulty: 'hard' },

    // ADDITIONAL MCQs
    { questionType: 'mcq', question: 'Somatotrophs comprise approximately what percentage of anterior pituitary hormone-producing cells?', options: ['A) 10%', 'B) 25%', 'C) 50%', 'D) 75%'], correctAnswer: 'C) 50%', explanation: 'Somatotrophs make up about 50% of the hormone-producing cells of the anterior pituitary, making GH the most abundantly produced pituitary hormone.', difficulty: 'medium' },
    { questionType: 'mcq', question: 'GH promotes growth primarily through which mechanism at the cellular level?', options: ['A) Direct inhibition of apoptosis', 'B) Inducing precursor cells to differentiate and secrete IGF-I locally', 'C) Stimulating mitochondrial biogenesis', 'D) Increasing intracellular calcium'], correctAnswer: 'B) Inducing precursor cells to differentiate and secrete IGF-I locally', explanation: 'GH induces precursor cells in bone and tissues to differentiate. These differentiated cells then secrete IGF-I locally, which stimulates cell division and growth.', difficulty: 'medium' },
    { questionType: 'mcq', question: 'Which of the following BEST describes the diabetogenic effect of GH?', options: ['A) GH destroys pancreatic beta cells', 'B) GH reduces glucose uptake by tissues and increases hepatic glucose output', 'C) GH directly inhibits insulin release', 'D) GH converts glucose to fatty acids'], correctAnswer: 'B) GH reduces glucose uptake by tissues and increases hepatic glucose output', explanation: 'The anti-insulin (diabetogenic) effect of GH involves reducing peripheral glucose uptake and increasing hepatic glucose output, leading to hyperglycaemia.', difficulty: 'medium' },
    { questionType: 'mcq', question: 'A patient with micropenis and recurrent hypoglycaemia in childhood MOST LIKELY has:', options: ['A) Cushing syndrome', 'B) GH deficiency', 'C) Hyperthyroidism', 'D) Conn syndrome'], correctAnswer: 'B) GH deficiency', explanation: 'Features of GH deficiency in children include short stature, micropenis, and hypoglycaemia (because GH normally has anti-insulin/glucose-sparing effects).', difficulty: 'medium' },
    { questionType: 'mcq', question: 'Pegvisomant is used in acromegaly because it:', options: ['A) Stimulates somatostatin release', 'B) Blocks GH receptors', 'C) Destroys somatotrophs', 'D) Inhibits GHRH'], correctAnswer: 'B) Blocks GH receptors', explanation: 'Pegvisomant is a GH receptor antagonist. It blocks the GH receptor so GH cannot exert its effects, reducing IGF-I levels. Used when surgery and somatostatin analogues fail.', difficulty: 'hard' },
    { questionType: 'mcq', question: 'During which stage of sleep is GH secretion at its peak?', options: ['A) REM sleep', 'B) Stage 1 NREM', 'C) Stage 2 NREM', 'D) Stage 3/4 (slow-wave) NREM'], correctAnswer: 'D) Stage 3/4 (slow-wave) NREM', explanation: 'The largest pulse of GH secretion occurs during deep slow-wave sleep (Stage 3/4 NREM). This is why sleep deprivation can impair growth in children.', difficulty: 'medium' },
    { questionType: 'mcq', question: 'The MOST common cause of acromegaly is:', options: ['A) Hypothalamic GHRH excess', 'B) Ectopic GH production', 'C) GH-secreting pituitary adenoma', 'D) Adrenal tumour'], correctAnswer: 'C) GH-secreting pituitary adenoma', explanation: 'Over 95% of acromegaly cases are caused by a GH-secreting pituitary adenoma (somatotroph adenoma). Ectopic sources are very rare.', difficulty: 'easy' },
    { questionType: 'mcq', question: 'Which of the following is NOT an effect of GH?', options: ['A) Protein synthesis', 'B) Linear growth', 'C) Decreased blood glucose', 'D) Tissue repair'], correctAnswer: 'C) Decreased blood glucose', explanation: 'GH promotes protein synthesis, linear growth, and tissue repair. It INCREASES blood glucose (anti-insulin/diabetogenic effect), not decreases it. Insulin is the only hormone that decreases blood glucose.', difficulty: 'easy' },
    { questionType: 'mcq', question: 'Increased spacing of the teeth is MOST characteristic of:', options: ['A) Gigantism', 'B) Acromegaly', 'C) Dwarfism', 'D) Hypothyroidism'], correctAnswer: 'B) Acromegaly', explanation: 'Increased tooth spacing results from mandible elongation and widening (prognathism), which is a hallmark feature of acromegaly. The jaw grows but the teeth do not, causing gaps.', difficulty: 'easy' },
    { questionType: 'mcq', question: 'Robert Wadlow, the tallest recorded human at 8\'11", is the most famous case of:', options: ['A) Acromegaly', 'B) Gigantism', 'C) Marfan syndrome', 'D) Klinefelter syndrome'], correctAnswer: 'B) Gigantism', explanation: 'Robert Wadlow had gigantism - excess GH before epiphyseal closure in childhood, resulting in extreme linear height growth to 8 feet 11 inches.', difficulty: 'easy' },
    { questionType: 'mcq', question: 'Loss of libido and impotence are features seen in:', options: ['A) Dwarfism only', 'B) Acromegaly only', 'C) Gigantism', 'D) GH deficiency in adults'], correctAnswer: 'C) Gigantism', explanation: 'Gigantism features include loss of libido and impotence due to gonadotropin suppression by the GH-secreting tumour compressing the normal pituitary tissue.', difficulty: 'medium' },
    { questionType: 'mcq', question: 'Which of the following is the FIRST-line surgical treatment for acromegaly?', options: ['A) Craniotomy', 'B) Transsphenoidal surgery', 'C) Gamma knife radiosurgery', 'D) Pituitary irradiation'], correctAnswer: 'B) Transsphenoidal surgery', explanation: 'Transsphenoidal surgery (through the nose/sphenoid sinus) is the first-line treatment to remove the GH-secreting pituitary adenoma. It is minimally invasive with good success rates.', difficulty: 'medium' },
    { questionType: 'mcq', question: 'In a GH stimulation test, which of the following agents can be used to provoke GH release?', options: ['A) Glucose load', 'B) Insulin-induced hypoglycaemia', 'C) Somatostatin infusion', 'D) Free fatty acid infusion'], correctAnswer: 'B) Insulin-induced hypoglycaemia', explanation: 'Insulin-induced hypoglycaemia is a potent stimulus for GH release and is used as a provocation test for GH deficiency. Glucose, somatostatin, and FFAs all INHIBIT GH.', difficulty: 'hard' },
    { questionType: 'mcq', question: 'GH differs from most other anterior pituitary hormones in that it:', options: ['A) Is a steroid hormone', 'B) Acts on nearly all tissues of the body', 'C) Is under tonic inhibition only', 'D) Has no feedback regulation'], correctAnswer: 'B) Acts on nearly all tissues of the body', explanation: 'GH affects most tissues of the body (bone, muscle, cartilage, liver, adipose). Most other pituitary hormones (TSH, ACTH, FSH, LH) target specific glands only.', difficulty: 'medium' },
    { questionType: 'mcq', question: 'The metabolic effect of GH on fat is:', options: ['A) Lipogenesis (fat storage)', 'B) No effect on fat metabolism', 'C) Lipolysis (fat breakdown)', 'D) Conversion of fat to protein'], correctAnswer: 'C) Lipolysis (fat breakdown)', explanation: 'GH promotes lipolysis - the breakdown of triglycerides in adipose tissue into free fatty acids and glycerol. This is part of its energy-mobilising role and explains why GH deficiency leads to increased body fat.', difficulty: 'medium' },
    { questionType: 'mcq', question: 'Which condition shows normal GH levels but defective response to GH?', options: ['A) Pituitary dwarfism', 'B) African Pygmy phenotype', 'C) Hypothalamic dwarfism', 'D) Acromegaly'], correctAnswer: 'B) African Pygmy phenotype', explanation: 'African Pygmies have normal GH production but lack functional GH receptors, similar to Laron dwarfism. GH is produced but cannot signal, resulting in short stature.', difficulty: 'hard' },

    // ADDITIONAL TRUE/FALSE
    { questionType: 'true_false', question: 'GH secretion follows a pulsatile pattern with the largest peak during deep sleep. True or False?', options: ['True', 'False'], correctAnswer: 'True', explanation: 'GH is secreted in pulsatile fashion with the largest secretory burst occurring during slow-wave (deep) NREM sleep, typically within the first hour of sleep.', difficulty: 'easy' },
    { questionType: 'true_false', question: 'Somatotrophs are the LEAST abundant cell type in the anterior pituitary. True or False?', options: ['True', 'False'], correctAnswer: 'False', explanation: 'Somatotrophs are the MOST abundant, comprising about 50% of the hormone-producing cells of the anterior pituitary.', difficulty: 'easy' },
    { questionType: 'true_false', question: 'IGF-I is produced exclusively in the liver. True or False?', options: ['True', 'False'], correctAnswer: 'False', explanation: 'While the liver is the PRIMARY source of circulating IGF-I, it is also produced locally by other tissues such as bone, cartilage, and muscle, where it acts in a paracrine/autocrine fashion.', difficulty: 'medium' },
    { questionType: 'true_false', question: 'Acromegaly can lead to secondary diabetes mellitus. True or False?', options: ['True', 'False'], correctAnswer: 'True', explanation: 'Chronic GH excess in acromegaly causes insulin resistance through anti-insulin effects, which can progress to impaired glucose tolerance and frank diabetes mellitus.', difficulty: 'medium' },
    { questionType: 'true_false', question: 'GH promotes linear growth by direct action on bone without any intermediary. True or False?', options: ['True', 'False'], correctAnswer: 'False', explanation: 'GH promotes linear growth primarily through IGF-I (Somatomedin C). GH stimulates local IGF-I production in bone, and IGF-I then stimulates chondrocyte proliferation in the epiphyseal plate.', difficulty: 'medium' },

    // ADDITIONAL FILL IN THE BLANK
    { questionType: 'fill_blank', question: 'The GH receptor antagonist used in acromegaly is called _____.', options: [], correctAnswer: 'Pegvisomant', explanation: 'Pegvisomant blocks the GH receptor, preventing GH from exerting its effects. It normalises IGF-I levels in patients with acromegaly resistant to other treatments.', difficulty: 'hard' },
    { questionType: 'fill_blank', question: 'The largest pulse of GH secretion occurs during _____ sleep.', options: [], correctAnswer: 'slow-wave (deep/Stage 3-4 NREM)', explanation: 'The major GH secretory burst occurs during deep slow-wave NREM sleep, typically in the first 1-2 hours after falling asleep.', difficulty: 'medium' },
    { questionType: 'fill_blank', question: 'GH has _____ effects on fat metabolism, promoting the breakdown of triglycerides.', options: [], correctAnswer: 'lipolytic', explanation: 'GH has lipolytic (fat-breaking) effects, mobilising free fatty acids from adipose tissue. This is why GH deficiency leads to increased body fat percentage.', difficulty: 'medium' },
    { questionType: 'fill_blank', question: 'In Laron dwarfism, the treatment of choice is recombinant _____ (mecasermin), not hGH.', options: [], correctAnswer: 'IGF-I', explanation: 'Since Laron dwarfism has defective GH receptors, giving GH is useless. Recombinant IGF-I (mecasermin) bypasses the defective receptor to directly stimulate growth.', difficulty: 'hard' },

    // ADDITIONAL CLINICAL SCENARIOS
    { questionType: 'mcq', question: 'A 55-year-old woman notices her rings no longer fit and her shoes are too tight. She also has a new onset of snoring and headaches. Her IGF-I is elevated. The MOST LIKELY diagnosis and initial management is:', options: ['A) Hypothyroidism - start levothyroxine', 'B) Acromegaly - transsphenoidal surgery', 'C) Gigantism - octreotide', 'D) Obesity - lifestyle modification'], correctAnswer: 'B) Acromegaly - transsphenoidal surgery', explanation: 'Increasing ring/shoe size, snoring (macroglossia/soft tissue growth), headaches, and elevated IGF-I point to acromegaly. Transsphenoidal surgery is first-line treatment.', difficulty: 'hard' },
    { questionType: 'mcq', question: 'An 8-year-old child presents with growth failure. GH stimulation test shows peak GH of 2 ng/mL (normal >10). IGF-I is low. The BEST treatment is:', options: ['A) Recombinant IGF-I', 'B) Recombinant human GH (hGH) injections', 'C) Somatostatin analogues', 'D) No treatment needed'], correctAnswer: 'B) Recombinant human GH (hGH) injections', explanation: 'Low GH on stimulation + low IGF-I = GH deficiency. Treatment is recombinant hGH replacement. IGF-I is only used for Laron dwarfism where GH receptors are defective.', difficulty: 'medium' },
    { questionType: 'mcq', question: 'A child is diagnosed with Laron dwarfism. Which lab pattern is expected?', options: ['A) Low GH, low IGF-I', 'B) High GH, high IGF-I', 'C) High GH, low IGF-I', 'D) Low GH, high IGF-I'], correctAnswer: 'C) High GH, low IGF-I', explanation: 'Laron dwarfism has defective GH receptors. GH is produced normally or even elevated (no negative feedback from IGF-I), but IGF-I is low because the liver cannot respond to GH.', difficulty: 'hard' },
  ],

  flashcards: [
    { front: 'What is the main mediator of GH\'s growth effects?', back: 'IGF-I (Somatomedin C), produced primarily by the liver. It stimulates cell division in bone, cartilage, and muscle.', difficulty: 'easy' },
    { front: 'Acromegaly vs Gigantism - when does each occur?', back: 'Acromegaly = ADULTS (after epiphyseal closure → acral/soft tissue growth). Gigantism = CHILDREN (before closure → linear height increase up to 7-8 ft).', difficulty: 'easy' },
    { front: 'What stimulates GH release?', back: 'GHRH, sleep (deep/slow-wave), exercise, insulin, hypoglycaemia.', difficulty: 'easy' },
    { front: 'What inhibits GH release?', back: 'Somatostatin, aging, obesity, exogenous GH, hyperglycaemia, free fatty acids.', difficulty: 'easy' },
    { front: 'What is Laron dwarfism?', back: 'GH Insensitive Syndrome - defective GH receptors. GH is normal/high but IGF-I is low. hGH treatment is INEFFECTIVE. Must use recombinant IGF-I (mecasermin).', difficulty: 'hard' },
    { front: 'What are the anti-insulin effects of GH?', back: 'GH promotes hyperglycaemia by reducing tissue glucose uptake and increasing hepatic glucose output. Chronic GH excess → insulin resistance → secondary diabetes.', difficulty: 'medium' },
    { front: 'What is prognathism?', back: 'Protrusion of the lower jaw due to mandible elongation/widening. Hallmark of acromegaly. Causes increased spacing of teeth.', difficulty: 'medium' },
    { front: 'How do you confirm acromegaly?', back: 'Oral Glucose Tolerance Test (OGTT): GH should suppress to <1 ng/mL. In acromegaly, GH is NOT suppressed because secretion is autonomous (from adenoma).', difficulty: 'hard' },
    { front: 'Features of gigantism?', back: 'Abnormal height (7-8 ft), large hands/feet, coarse facial features, thick lips, macroglossia, bilateral gynaecomastia, loss of libido/impotence.', difficulty: 'medium' },
    { front: 'Why does GH deficiency in children cause hypoglycaemia?', back: 'GH has anti-insulin (glucose-raising) effects. Without GH, there is less counter-regulation against insulin → tendency to hypoglycaemia, especially during fasting.', difficulty: 'hard' },
    { front: 'What is the treatment of acromegaly?', back: '1st line: Transsphenoidal surgery. 2nd line: Somatostatin analogues (octreotide). 3rd line: GH receptor antagonist (pegvisomant). Radiation if all else fails.', difficulty: 'hard' },
    { front: 'What metabolic effects does GH have?', back: 'Protein synthesis ↑, Linear growth ↑, Lipolysis ↑ (fat breakdown), Anti-insulin/Diabetogenic (↑blood glucose), Tissue repair ↑. Acts mainly through IGF-I from the liver.', difficulty: 'medium' },
    { front: 'What is the GH stimulation test?', back: 'Used to diagnose GH deficiency. Insulin-induced hypoglycaemia provokes GH release. If peak GH stays <10 ng/mL, GH deficiency is confirmed.', difficulty: 'hard' },
    { front: 'What percentage of anterior pituitary cells are somatotrophs?', back: 'About 50% of all hormone-producing cells in the anterior pituitary are somatotrophs. GH is the most abundantly produced pituitary hormone.', difficulty: 'medium' },
    { front: 'What causes the increased tooth spacing in acromegaly?', back: 'Mandible elongation and widening (prognathism) increases jaw size, but the number and size of teeth remain the same → increased spaces between teeth.', difficulty: 'medium' },
  ],
};
