/**
 * FINAL BLOCK FOR 300 LEVEL MBBS 2026 — Pre-loaded Study Material
 * Source: Final Block DOCX covering 8 major topics
 * Topics: Pancreatic Hormones, Adrenal Hormones, Male Reproductive Organs,
 *         Foetal Circulation, CNS Physiologic Anatomy, Spinal Cord Lesions,
 *         Scotopic/Photopic Vision, Thalamus
 */

export const finalBlockMaterial = {
  title: 'Final Block — 300 Level MBBS 2026',
  fileType: 'docx',
  wordCount: 4900,
  status: 'analyzed' as const,

  summary: {
    definitions: [
      // PANCREATIC HORMONES
      { term: 'Islets of Langerhans', definition: 'Endocrine components of the pancreas that secrete hormones directly into the blood. Composed of: Beta cells (60-70%, Insulin), Alpha cells (20-25%, Glucagon), Delta cells (5-10%, Somatostatin), PP/F cells (1-5%, Pancreatic Polypeptide).' },
      { term: 'Insulin', definition: 'Peptide hormone of 51 amino acids secreted by beta cells. Secreted as proinsulin → cleaved to insulin + C-peptide. Half-life ~5 min. Binds tyrosine kinase receptor (TKR), causes GLUT-4 translocation. The ONLY hypoglycaemic hormone.' },
      { term: 'Glucagon', definition: 'Peptide hormone of 29 amino acids secreted by alpha cells. Counter-regulatory hormone to insulin. Acts via G-protein coupled receptor → adenylate cyclase → ↑cAMP. Primary target is the liver.' },
      { term: 'Somatostatin (Pancreatic)', definition: 'Secreted by delta cells. Also produced in hypothalamus and GI tract. Inhibits insulin, glucagon, GH, and GI secretions. Acts as local paracrine regulator. Synthetic analogue: Octreotide.' },
      { term: 'C-peptide', definition: 'Connecting peptide released when proinsulin is cleaved to active insulin. Clinically used to distinguish endogenous from exogenous insulin — present in endogenous insulin secretion, absent when exogenous insulin is given.' },
      { term: 'Diabetic Ketoacidosis (DKA)', definition: 'Life-threatening complication of Type 1 DM due to absolute insulin deficiency. Results in: hyperglycaemia, increased lipolysis → free fatty acids → ketone bodies → metabolic acidosis. Features: Kussmaul breathing, fruity breath.' },
      { term: 'OGTT (Oral Glucose Tolerance Test)', definition: 'Diagnostic test for diabetes. Method: fasting blood glucose → 75g oral glucose → check at 1, 2, 3 hrs. Normal: <6.1 mmol/L fasting. Impaired: 6.1-7.0 mmol/L. Diabetic: ≥7.0 mmol/L fasting repeatedly.' },
      // ADRENAL HORMONES
      { term: 'Adrenal Cortex', definition: 'Outer part of adrenal gland (80-90%), mesodermal origin. Three zones: Zona Glomerulosa (outer, mineralocorticoids/aldosterone), Zona Fasciculata (middle, glucocorticoids/cortisol), Zona Reticularis (inner, androgens/DHEA).' },
      { term: 'Adrenal Medulla', definition: 'Inner part of adrenal gland, neural crest origin. Composed of chromaffin cells (modified post-ganglionic sympathetic neurons). Secretes catecholamines: Epinephrine (80%) and Norepinephrine (20%).' },
      { term: 'RAAS', definition: 'Renin-Angiotensin-Aldosterone System. Full hormonal cascade: Renin → Angiotensin I → (ACE) → Angiotensin II → Aldosterone. Provides long-term blood pressure and fluid regulation via Na+/water retention.' },
      { term: 'Cushing\'s Syndrome', definition: 'Excess cortisol. Causes: pituitary adenoma, adrenal tumour, steroid therapy. Features: moon face, buffalo hump, hypertension, diabetes, muscle wasting, truncal obesity.' },
      { term: 'Addison\'s Disease', definition: 'Primary adrenal insufficiency. Causes: autoimmune destruction, TB, metastasis. Features: weakness, fatigue, weight loss, hypotension, hyperpigmentation, hyponatraemia, hyperkalaemia.' },
      { term: 'Conn\'s Syndrome', definition: 'Primary hyperaldosteronism. Causes: adrenal adenoma or hyperplasia. Features: hypertension, hypokalaemia, metabolic alkalosis, polyuria, polydipsia.' },
      { term: 'Phaeochromocytoma', definition: 'Tumour of chromaffin cells in adrenal medulla. Features: episodic hypertension, palpitations, headache, sweating. Diagnosed by urinary catecholamines/metanephrines.' },
      // MALE REPRODUCTIVE
      { term: 'Sertoli Cells', definition: 'Support cells in seminiferous tubules. Functions: nourish and protect developing sperm, form blood-testis barrier, secrete inhibin (negative feedback on FSH), secrete androgen-binding protein.' },
      { term: 'Leydig Cells', definition: 'Interstitial cells located between seminiferous tubules. Function: produce testosterone in response to LH stimulation.' },
      { term: 'Spermatogenesis', definition: 'Process of sperm formation taking ~74 days. Stages: Spermatocytogenesis (mitosis) → Meiosis I (2n→n) → Meiosis II (n→n) → Spermiogenesis (spermatid→spermatozoon). Occurs in seminiferous tubules from puberty onwards.' },
      // FOETAL CIRCULATION
      { term: 'Ductus Venosus', definition: 'Foetal shunt between umbilical vein and IVC. Bypasses the liver. After birth, closes to become the ligamentum venosum.' },
      { term: 'Foramen Ovale', definition: 'Foetal shunt between right and left atrium. Bypasses the lungs. After birth, closes due to increased left atrial pressure to become fossa ovalis.' },
      { term: 'Ductus Arteriosus', definition: 'Foetal shunt between pulmonary artery and aorta. Bypasses the lungs. After birth, closes due to increased oxygen tension to become ligamentum arteriosum.' },
      // CNS / SPINAL CORD
      { term: 'Spinal Shock', definition: 'Period immediately following complete spinal cord transection. Features: NO sensory or motor activity below lesion, flaccid paralysis, loss of all reflexes, loss of sensation, bladder/rectum paralysis, BP may drop (especially T1 transection → MBP 100→40 mmHg).' },
      { term: 'Upper Motor Neuron Lesion (UMNL)', definition: 'Lesion above the anterior horn cell. Features: hypertonia, spastic paralysis, exaggerated deep reflexes, positive Babinski sign, clonus present, superficial reflexes lost, groups of muscles affected.' },
      { term: 'Lower Motor Neuron Lesion (LMNL)', definition: 'Lesion at or below the anterior horn cell. Features: hypotonia, flaccid paralysis, deep reflexes lost, Babinski absent, clonus absent, fasciculations present on EMG, individual muscles affected.' },
      // VISION
      { term: 'Photopic Vision', definition: 'Cone-mediated daylight vision. High acuity, colour discrimination (trichromatic). Peak sensitivity at 555 nm (green-yellow). Cones concentrated in fovea centralis.' },
      { term: 'Scotopic Vision', definition: 'Rod-mediated dim-light/night vision. Very high sensitivity (can detect single photon), no colour vision (achromatic). Peak sensitivity at 507 nm (blue-green). Rods in peripheral retina.' },
      { term: 'Rhodopsin', definition: 'Visual pigment in rods. Highly sensitive to light. Bleached under bright light (rods non-functional). Regenerates in darkness enabling scotopic vision. Requires vitamin A for regeneration.' },
      // THALAMUS
      { term: 'Thalamus', definition: 'Subcortical mass of grey matter in the diencephalon. Gateway to the cerebral cortex. Filters and modulates ALL sensory information (except olfaction) before it reaches consciousness. Has reciprocal connections with cortex.' },
      { term: 'VPL & VPM Nuclei', definition: 'Ventral Posterolateral (body sensation) and Ventral Posteromedial (face sensation) nuclei of thalamus. Relay somatosensory information to post-central gyrus (primary somatosensory cortex).' },
    ],

    keyPoints: [
      // PANCREATIC HORMONES
      'Pancreas is a mixed gland: exocrine (digestive enzymes) + endocrine (hormones from Islets of Langerhans).',
      'Insulin is the ONLY hypoglycaemic hormone. Actions: ↓blood glucose, ↑glucose uptake (GLUT-4), ↑glycogenesis, ↓gluconeogenesis, ↑lipogenesis, ↑protein synthesis.',
      'Insulin binds tyrosine kinase receptor (TKR) and causes GLUT-4 translocation in muscle and adipose tissue.',
      'Glucagon is the major counter-regulatory hormone. Actions on liver: ↑glycogenolysis, ↑gluconeogenesis, ↑ketogenesis, ↑lipolysis.',
      'Type 1 DM: autoimmune β-cell destruction, absolute insulin deficiency, HLA-DR3/DR4, DKA. Type 2 DM: insulin resistance, relative deficiency, strong genetic/lifestyle, HHS.',
      'Gestational DM: placental hormones (hPL, oestrogen, progesterone) cause insulin resistance → foetal macrosomia, neonatal hypoglycaemia.',
      'Insulinoma: β-cell tumour → excess insulin → hypoglycaemia. Features: confusion, coma (neuroglycopenic) + sweating, tremor, palpitations (autonomic).',
      'Glucagonoma: α-cell tumour → hyperglycaemia + necrolytic migratory erythema + weight loss + anaemia.',
      'Somatostatinoma: inhibits insulin + glucagon → mild DM + steatorrhoea + gallstones + hypochlorhydria.',
      'DKA occurs ONLY in absolute insulin deficiency (Type 1). HHS occurs in Type 2.',
      // ADRENAL HORMONES
      'Adrenal cortex mnemonic for zones: GFR → Glomerulosa (aldosterone), Fasciculata (cortisol), Reticularis (androgens). "Salt, Sugar, Sex".',
      'Aldosterone: regulated by RAAS + plasma K+. Actions: ↑Na+ reabsorption, ↑K+/H+ excretion at distal tubule/collecting duct.',
      'Cortisol: regulated by HPA axis (CRH→ACTH→Cortisol). Circadian rhythm (peak early morning). Actions: ↑gluconeogenesis, anti-inflammatory, immunosuppressive, anti-insulin.',
      'Catecholamine synthesis: Tyrosine → DOPA → Dopamine → Norepinephrine → Epinephrine. Fight-or-flight response.',
      'RAS = Angiotensin II pathway only (short-term BP via vasoconstriction). RAAS = Angiotensin II + Aldosterone (long-term BP + fluid regulation).',
      'Right adrenal vein → IVC. Left adrenal vein → Left renal vein.',
      // MALE REPRODUCTIVE
      'Testes: seminiferous tubules (spermatogenesis) + Sertoli cells (support) + Leydig cells (testosterone production).',
      'Spermatogenesis takes ~74 days. Regulated by HPG axis: GnRH → FSH (Sertoli) + LH (Leydig). Inhibin from Sertoli cells inhibits FSH.',
      'Seminal vesicles contribute 60% of semen (fructose-rich). Prostate contributes 30% (alkaline, PSA). Bulbourethral glands lubricate.',
      'Sex determination: XX = female, XY = male. During meiosis, each gamete gets 22 autosomes + 1 sex chromosome.',
      // FOETAL CIRCULATION
      'Three foetal shunts: Ductus Venosus (bypasses liver), Foramen Ovale (bypasses lungs, RA→LA), Ductus Arteriosus (bypasses lungs, PA→Aorta). Mnemonic: FDD.',
      'Oxygenated blood from placenta → Umbilical vein → Ductus venosus → IVC → RA → Foramen Ovale → LA → LV → Aorta → Head/upper body.',
      'Postnatal: lungs expand → ↓pulmonary resistance → FO closes (fossa ovalis). ↑O₂ → DA closes (ligamentum arteriosum). UV → ligamentum teres. DV → ligamentum venosum.',
      // CNS / SPINAL CORD
      '31 pairs of spinal nerves: 8 cervical, 12 thoracic, 5 lumbar, 5 sacral, 1 coccygeal.',
      'Dorsal root = sensory (afferent). Ventral root = motor (efferent). "Dorsal = Data in, Ventral = Ventures out".',
      'Reflex arc: Receptor → Afferent nerve → Centre (synapse) → Efferent nerve → Effector organ.',
      'UMNL = spastic paralysis, hypertonia, exaggerated deep reflexes, Babinski +, clonus. LMNL = flaccid paralysis, hypotonia, lost reflexes, fasciculations.',
      'Types of paralysis: Monoplegia (1 limb), Diplegia (both UL or LL), Hemiplegia (one side), Paraplegia (lower body), Quadriplegia (all 4 limbs).',
      // VISION
      'Photopic: cones, daylight, high acuity, colour vision, fovea, 555 nm peak. Scotopic: rods, night, low acuity, no colour, peripheral retina, 507 nm peak.',
      'Three cone types: S-cones (blue), M-cones (green), L-cones (red). Trichromatic colour vision.',
      'Night blindness (nyctalopia): impaired rod function due to vitamin A deficiency or retinitis pigmentosa.',
      // THALAMUS
      'Thalamus is the gateway to the cerebral cortex. ALL sensory pathways relay through thalamus EXCEPT olfaction.',
      'Key thalamic nuclei: VPL/VPM (somatosensory), LGB (vision), MGB (hearing), VA/VL (motor), Anterior (emotion/memory), Mediodorsal (behaviour/cognition).',
      'Functions: sensory relay, motor coordination, sleep/wakefulness, consciousness, subcortical sensation perception, memory, emotional reactions.',
    ],

    examHighlights: [
      'Insulin is the ONLY hypoglycaemic hormone — always tested. All other hormones (glucagon, cortisol, GH, epinephrine) raise blood glucose.',
      'C-peptide distinguishes endogenous vs exogenous insulin — critical for insulinoma diagnosis.',
      'DKA = absolute insulin deficiency (Type 1). HHS = Type 2. This distinction is always tested.',
      'Adrenal cortex zones: GFR = Salt (aldosterone), Sugar (cortisol), Sex (androgens). Most tested mnemonic.',
      'Cortisol has anti-insulin effects — just like GH. Both are diabetogenic.',
      'Right adrenal vein → IVC directly. Left adrenal vein → Left renal vein. Frequently tested anatomy.',
      'Three foetal shunts and what they become: FO→fossa ovalis, DA→ligamentum arteriosum, DV→ligamentum venosum, UV→ligamentum teres.',
      'UMNL vs LMNL: Babinski sign present in UMNL only. Clonus present in UMNL only. Fasciculations present in LMNL only.',
      'Quadriplegia = cervical (C1-8) transection. Paraplegia = thoracic transection.',
      'Olfaction is the ONLY sensation that bypasses the thalamus — most tested thalamus fact.',
      'Rhodopsin in rods requires Vitamin A → deficiency causes night blindness.',
      'OGTT interpretation: Normal <6.1, Impaired 6.1-7.0, Diabetic ≥7.0 mmol/L fasting.',
    ],

    clinicalCorrelations: [
      'Type 1 DM: Autoimmune β-cell destruction (HLA-DR3/DR4, Coxsackie B virus trigger). Presents with 3 Ps + weight loss + DKA (Kussmaul breathing). Treated with insulin.',
      'Type 2 DM: Insulin resistance → β-cell exhaustion. Genetic + lifestyle. HHS (not DKA). Treated with metformin, sulfonylureas, then insulin.',
      'Insulinoma: Whipple\'s triad (symptoms of hypoglycaemia + low glucose + relief after glucose). High C-peptide confirms endogenous source.',
      'Cushing\'s: Excess cortisol → central obesity, moon face, buffalo hump, striae, DM, HTN, osteoporosis, muscle wasting.',
      'Addison\'s: Adrenal insufficiency → hyperpigmentation (↑ACTH/MSH), hypotension, salt craving, hyperkalaemia. Adrenal crisis = medical emergency.',
      'Conn\'s: Primary hyperaldosteronism → HTN + hypokalaemia + metabolic alkalosis. Resistant hypertension that doesn\'t respond to standard treatment.',
      'Phaeochromocytoma: Rule of 10s — 10% bilateral, 10% extra-adrenal, 10% malignant, 10% familial. 24-hour urine metanephrines for diagnosis.',
      'Patent Ductus Arteriosus (PDA): DA fails to close after birth. Machine-like continuous murmur. Treat with indomethacin (closes DA) or surgery.',
      'Night blindness (Nyctalopia): Vitamin A deficiency → inadequate rhodopsin regeneration → rod dysfunction. Common in malnourished children.',
      'Brown-Séquard syndrome: Hemisection of spinal cord → ipsilateral motor loss + contralateral pain/temperature loss.',
    ],

    processes: [
      {
        name: 'Insulin Signalling Pathway',
        steps: [
          'Glucose enters β-cell via GLUT-2',
          'Glucose metabolised → ↑ATP/ADP ratio',
          'ATP-sensitive K+ channels close → membrane depolarisation',
          'Voltage-gated Ca²+ channels open → Ca²+ influx',
          'Ca²+ triggers insulin granule exocytosis',
          'Insulin released into portal circulation',
          'Insulin binds TKR on target cells → autophosphorylation',
          'Activates IRS → PI3K → GLUT-4 translocation to cell membrane',
          'Glucose enters muscle/adipose cells',
        ],
      },
      {
        name: 'Foetal Circulation Pathway',
        steps: [
          'Oxygenated blood from placenta enters via umbilical vein',
          'Half bypasses liver through ductus venosus → IVC',
          'Mixed blood enters right atrium',
          'Most blood crosses foramen ovale → left atrium → left ventricle → aorta → head/upper body',
          'Remaining enters right ventricle → pulmonary artery',
          'Most diverts through ductus arteriosus → descending aorta (bypassing lungs)',
          'Small amount reaches lungs for development',
          'Deoxygenated blood returns to placenta via two umbilical arteries (from internal iliac arteries)',
        ],
      },
      {
        name: 'RAAS Cascade',
        steps: [
          'Decreased renal perfusion / ↓Na+ at macula densa / sympathetic stimulation',
          'Juxtaglomerular cells release Renin',
          'Renin converts Angiotensinogen (from liver) → Angiotensin I',
          'ACE (in lungs) converts Angiotensin I → Angiotensin II',
          'Angiotensin II: vasoconstriction + stimulates aldosterone release from zona glomerulosa',
          'Aldosterone: ↑Na+/H₂O reabsorption + ↑K+ excretion at distal tubule',
          'Result: ↑blood volume + ↑blood pressure',
        ],
      },
    ],

    mnemonics: [
      { topic: 'Adrenal Cortex Zones', mnemonic: 'GFR — Salt, Sugar, Sex', explanation: 'Zona Glomerulosa (mineralocorticoids/Salt/Aldosterone), Zona Fasciculata (glucocorticoids/Sugar/Cortisol), Zona Reticularis (androgens/Sex/DHEA). From outer to inner.' },
      { topic: 'Foetal Shunts', mnemonic: 'FDD — Foramen Ovale, Ductus Arteriosus, Ductus Venosus', explanation: 'Three main shunts that bypass non-functional organs. FO bypasses lungs (RA→LA). DA bypasses lungs (PA→Aorta). DV bypasses liver (UV→IVC).' },
      { topic: 'Postnatal Closure', mnemonic: 'U DO LA', explanation: 'Umbilical vessels close, Ductus arteriosus closes, Oxygen increases, Lungs take over, Atrial shunt (FO) closes.' },
      { topic: 'DM Classical Features', mnemonic: '3 Ps + W: Polyuria, Polydipsia, Polyphagia + Weight loss', explanation: 'Classic presentation of Type 1 DM. Polyuria (osmotic diuresis), polydipsia (dehydration), polyphagia (cell starvation despite high glucose), weight loss (protein catabolism).' },
      { topic: 'Paralysis Types', mnemonic: 'Mon-Di-Hemi-Para-Quad: 1-2-Half-Lower-All', explanation: 'Monoplegia (1 limb), Diplegia (2 limbs same level), Hemiplegia (half body), Paraplegia (lower body), Quadriplegia (all 4 limbs).' },
      { topic: 'UMNL vs LMNL', mnemonic: 'UMNL = Up means Spastic. LMNL = Low means Flaccid', explanation: 'UMNL: hypertonia, spastic paralysis, hyperreflexia, Babinski+, clonus. LMNL: hypotonia, flaccid paralysis, areflexia, fasciculations.' },
      { topic: 'Cranial Nerves', mnemonic: 'Oh Oh Oh To Touch And Feel Very Good Velvet AH — Olfactory, Optic, Oculomotor, Trochlear, Trigeminal, Abducens, Facial, Vestibulocochlear, Glossopharyngeal, Vagus, Accessory, Hypoglossal', explanation: 'Mnemonic for 12 cranial nerves in order (I-XII).' },
    ],

    quickReview: [
      'Insulin = only hypoglycaemic hormone. Glucagon = main counter-regulatory. Both are peptides from pancreatic islets.',
      'Adrenal cortex: 3 zones (GFR) → Salt/Sugar/Sex. Medulla: chromaffin cells → catecholamines (E 80%, NE 20%).',
      'Foetal circulation: 3 shunts bypass liver (DV) and lungs (FO + DA). After birth: all close → adult circulation.',
      'UMNL = spastic + hyperreflexia + Babinski+. LMNL = flaccid + areflexia + fasciculations. Key exam distinction.',
      'Thalamus = gateway to cortex for ALL sensations EXCEPT olfaction. Key nuclei: VPL/VPM (sensation), LGB (vision), MGB (hearing).',
      'Photopic = cones/day/colour/acuity. Scotopic = rods/night/no colour/sensitive. Night blindness = Vit A deficiency → rhodopsin problem.',
    ],
  },

  questions: [
    // PANCREATIC HORMONES — MCQ
    { questionType: 'mcq', question: 'Which cells of the Islets of Langerhans secrete insulin?', options: ['A) Alpha cells', 'B) Beta cells', 'C) Delta cells', 'D) PP cells'], correctAnswer: 'B) Beta cells', explanation: 'Beta cells comprise 60-70% of islet cells and secrete insulin. Alpha cells secrete glucagon, delta cells secrete somatostatin, PP/F cells secrete pancreatic polypeptide.', difficulty: 'easy' },
    { questionType: 'mcq', question: 'Insulin acts on which type of receptor?', options: ['A) G-protein coupled receptor', 'B) Tyrosine kinase receptor', 'C) Nuclear receptor', 'D) Ligand-gated ion channel'], correctAnswer: 'B) Tyrosine kinase receptor', explanation: 'Insulin binds to tyrosine kinase receptor (TKR), activates intracellular signalling pathways, and causes GLUT-4 transporter translocation in muscle and adipose tissue.', difficulty: 'medium' },
    { questionType: 'mcq', question: 'The MOST important stimulator of insulin secretion is:', options: ['A) Amino acids', 'B) Parasympathetic stimulation', 'C) Increased blood glucose', 'D) Sulfonylurea drugs'], correctAnswer: 'C) Increased blood glucose', explanation: 'Increased blood glucose is the most important stimulator of insulin secretion. Other stimulators include amino acids (arginine, leucine), GI hormones (GLP-1, GIP), and parasympathetic stimulation.', difficulty: 'easy' },
    { questionType: 'mcq', question: 'A patient with Type 1 DM is MOST LIKELY to present with:', options: ['A) Hyperosmolar state', 'B) Diabetic Ketoacidosis', 'C) Metabolic alkalosis', 'D) Insulin resistance alone'], correctAnswer: 'B) Diabetic Ketoacidosis', explanation: 'DKA occurs ONLY in absolute insulin deficiency (Type 1 DM). Without insulin, lipolysis is uncontrolled → ↑FFA → ↑ketone bodies → metabolic acidosis. Type 2 DM presents with HHS, not DKA.', difficulty: 'medium' },
    { questionType: 'mcq', question: 'C-peptide is clinically useful because it:', options: ['A) Stimulates insulin release', 'B) Distinguishes endogenous from exogenous insulin', 'C) Converts proinsulin to glucagon', 'D) Inhibits glucagon secretion'], correctAnswer: 'B) Distinguishes endogenous from exogenous insulin', explanation: 'C-peptide is co-secreted with insulin from beta cells. Exogenous insulin injections do not contain C-peptide. High insulin + high C-peptide = endogenous (insulinoma). High insulin + low C-peptide = exogenous.', difficulty: 'hard' },
    { questionType: 'mcq', question: 'The MOST LIKELY diagnosis in a patient with necrolytic migratory erythema, diabetes, and weight loss is:', options: ['A) Insulinoma', 'B) Somatostatinoma', 'C) Glucagonoma', 'D) VIPoma'], correctAnswer: 'C) Glucagonoma', explanation: 'The classic triad of glucagonoma is: necrolytic migratory erythema + diabetes mellitus + weight loss. It is caused by an alpha-cell tumour producing excess glucagon.', difficulty: 'hard' },
    { questionType: 'mcq', question: 'Which hormone STABILIZES blood glucose (prevents extreme fluctuations)?', options: ['A) Insulin', 'B) Glucagon', 'C) Somatostatin', 'D) Epinephrine'], correctAnswer: 'C) Somatostatin', explanation: 'Somatostatin inhibits both insulin AND glucagon secretion, acting as a local paracrine regulator that prevents extreme fluctuations in blood glucose.', difficulty: 'medium' },
    { questionType: 'mcq', question: 'Glucagon acts primarily on the:', options: ['A) Muscle', 'B) Adipose tissue', 'C) Liver', 'D) Brain'], correctAnswer: 'C) Liver', explanation: 'The liver is the primary target of glucagon. It promotes hepatic glycogenolysis, gluconeogenesis, and ketogenesis to raise blood glucose during fasting.', difficulty: 'easy' },
    { questionType: 'mcq', question: 'A fasting blood glucose of 7.5 mmol/L on repeated testing indicates:', options: ['A) Normal OGTT', 'B) Impaired glucose tolerance', 'C) Diabetes mellitus', 'D) Reactive hypoglycaemia'], correctAnswer: 'C) Diabetes mellitus', explanation: 'Fasting levels repeatedly at or above 7.0 mmol/L (126 mg/dL) are diagnostic of diabetes mellitus according to OGTT interpretation criteria.', difficulty: 'medium' },
    { questionType: 'mcq', question: 'Amylin is co-secreted with:', options: ['A) Glucagon', 'B) Insulin', 'C) Somatostatin', 'D) Pancreatic polypeptide'], correctAnswer: 'B) Insulin', explanation: 'Amylin (IAPP) is co-secreted with insulin from beta cells. It slows gastric emptying and suppresses glucagon. In T2DM, amylin deficiency and islet amyloid deposition worsen β-cell dysfunction.', difficulty: 'medium' },

    // ADRENAL HORMONES — MCQ
    { questionType: 'mcq', question: 'The zona fasciculata of the adrenal cortex secretes:', options: ['A) Aldosterone', 'B) Cortisol', 'C) DHEA', 'D) Epinephrine'], correctAnswer: 'B) Cortisol', explanation: 'Zona Fasciculata (middle layer) secretes glucocorticoids, primarily cortisol. Zona Glomerulosa = aldosterone. Zona Reticularis = androgens (DHEA). Medulla = catecholamines.', difficulty: 'easy' },
    { questionType: 'mcq', question: 'The MOST LIKELY diagnosis in a patient with hypertension, hypokalaemia, and metabolic alkalosis is:', options: ['A) Cushing\'s syndrome', 'B) Addison\'s disease', 'C) Conn\'s syndrome', 'D) Phaeochromocytoma'], correctAnswer: 'C) Conn\'s syndrome', explanation: 'Conn\'s syndrome (primary hyperaldosteronism) presents with hypertension + hypokalaemia + metabolic alkalosis. Excess aldosterone causes Na+/water retention (HTN) and K+/H+ excretion.', difficulty: 'medium' },
    { questionType: 'mcq', question: 'Hyperpigmentation in Addison\'s disease is due to:', options: ['A) Excess cortisol', 'B) Excess aldosterone', 'C) Increased ACTH/MSH', 'D) Increased catecholamines'], correctAnswer: 'C) Increased ACTH/MSH', explanation: 'In primary adrenal insufficiency, low cortisol → loss of negative feedback → ↑ACTH. ACTH shares a precursor (POMC) with MSH (melanocyte-stimulating hormone), causing hyperpigmentation.', difficulty: 'hard' },
    { questionType: 'mcq', question: 'The right adrenal vein drains into the:', options: ['A) Right renal vein', 'B) Inferior vena cava', 'C) Left renal vein', 'D) Azygos vein'], correctAnswer: 'B) Inferior vena cava', explanation: 'Right suprarenal vein → IVC directly. Left suprarenal vein → Left renal vein. This asymmetry is frequently tested in anatomy and surgery exams.', difficulty: 'medium' },
    { questionType: 'mcq', question: 'Catecholamine synthesis follows the pathway:', options: ['A) Tryptophan → Serotonin → Melatonin', 'B) Tyrosine → DOPA → Dopamine → NE → Epinephrine', 'C) Phenylalanine → Tyrosine → Melanin', 'D) Histidine → Histamine → Serotonin'], correctAnswer: 'B) Tyrosine → DOPA → Dopamine → NE → Epinephrine', explanation: 'The catecholamine synthesis pathway: Tyrosine → DOPA (tyrosine hydroxylase, rate-limiting) → Dopamine → Norepinephrine → Epinephrine (PNMT enzyme, requires cortisol).', difficulty: 'medium' },
    { questionType: 'mcq', question: 'RAS differs from RAAS primarily in that RAS:', options: ['A) Includes aldosterone effects', 'B) Provides long-term volume control', 'C) Only involves angiotensin II-mediated vasoconstriction', 'D) Acts on distal nephron prominently'], correctAnswer: 'C) Only involves angiotensin II-mediated vasoconstriction', explanation: 'RAS = Angiotensin pathway only → rapid vasoconstriction for short-term BP control. RAAS = Angiotensin II + Aldosterone → long-term BP and fluid regulation via Na+/water retention.', difficulty: 'hard' },

    // MALE REPRODUCTIVE — MCQ
    { questionType: 'mcq', question: 'Testosterone is produced by which cells?', options: ['A) Sertoli cells', 'B) Leydig cells', 'C) Spermatogonia', 'D) Spermatids'], correctAnswer: 'B) Leydig cells', explanation: 'Leydig (interstitial) cells produce testosterone in response to LH stimulation. Sertoli cells support spermatogenesis, secrete inhibin, and form the blood-testis barrier.', difficulty: 'easy' },
    { questionType: 'mcq', question: 'Spermatogenesis takes approximately:', options: ['A) 24 days', 'B) 48 days', 'C) 74 days', 'D) 120 days'], correctAnswer: 'C) 74 days', explanation: 'The complete process from primitive germ cell to mature spermatozoon takes approximately 74 days. It occurs in the seminiferous tubules from puberty throughout adult life.', difficulty: 'medium' },
    { questionType: 'mcq', question: 'Seminal vesicles contribute what percentage of semen volume?', options: ['A) 30%', 'B) 60%', 'C) 5%', 'D) 90%'], correctAnswer: 'B) 60%', explanation: 'Seminal vesicles contribute about 60% of semen volume. Their secretion is alkaline and rich in fructose (energy source for sperm). Prostate contributes ~30%.', difficulty: 'medium' },
    { questionType: 'mcq', question: 'Inhibin from Sertoli cells provides negative feedback on:', options: ['A) LH', 'B) FSH', 'C) GnRH', 'D) Testosterone'], correctAnswer: 'B) FSH', explanation: 'Inhibin secreted by Sertoli cells specifically inhibits FSH release from the anterior pituitary via negative feedback. This regulates spermatogenesis.', difficulty: 'medium' },

    // FOETAL CIRCULATION — MCQ
    { questionType: 'mcq', question: 'The ductus venosus in foetal circulation bypasses the:', options: ['A) Lungs', 'B) Liver', 'C) Heart', 'D) Kidneys'], correctAnswer: 'B) Liver', explanation: 'The ductus venosus shunts oxygenated blood from the umbilical vein directly to the IVC, bypassing the liver. After birth it becomes the ligamentum venosum.', difficulty: 'easy' },
    { questionType: 'mcq', question: 'Which foetal shunt connects the pulmonary artery to the aorta?', options: ['A) Foramen ovale', 'B) Ductus venosus', 'C) Ductus arteriosus', 'D) Umbilical vein'], correctAnswer: 'C) Ductus arteriosus', explanation: 'The ductus arteriosus connects the pulmonary artery to the descending aorta, allowing most blood to bypass the non-functional lungs. It becomes the ligamentum arteriosum after birth.', difficulty: 'easy' },
    { questionType: 'mcq', question: 'After birth, the foramen ovale closes to become the:', options: ['A) Ligamentum arteriosum', 'B) Ligamentum venosum', 'C) Fossa ovalis', 'D) Ligamentum teres'], correctAnswer: 'C) Fossa ovalis', explanation: 'After birth, lungs expand → ↓pulmonary resistance → ↑left atrial pressure > right atrial pressure → foramen ovale flap closes → becomes fossa ovalis.', difficulty: 'easy' },
    { questionType: 'mcq', question: 'The MOST LIKELY trigger for closure of the ductus arteriosus after birth is:', options: ['A) Decreased blood pressure', 'B) Increased oxygen tension', 'C) Decreased prostaglandins', 'D) Increased left atrial pressure'], correctAnswer: 'B) Increased oxygen tension', explanation: 'Increased oxygen tension after birth causes constriction and functional closure of the ductus arteriosus. Prostaglandins keep it open in utero; indomethacin (prostaglandin inhibitor) can close a PDA.', difficulty: 'medium' },
    { questionType: 'mcq', question: 'The umbilical vein after birth becomes the:', options: ['A) Ligamentum arteriosum', 'B) Fossa ovalis', 'C) Ligamentum teres', 'D) Ligamentum venosum'], correctAnswer: 'C) Ligamentum teres', explanation: 'After birth, the umbilical vein obliterates and becomes the ligamentum teres (round ligament of the liver). The umbilical arteries become medial umbilical ligaments.', difficulty: 'medium' },

    // CNS / SPINAL CORD — MCQ
    { questionType: 'mcq', question: 'Complete spinal cord transection at T1 will cause blood pressure to drop to approximately:', options: ['A) 80 mmHg', 'B) 60 mmHg', 'C) 40 mmHg', 'D) 20 mmHg'], correctAnswer: 'C) 40 mmHg', explanation: 'T1 transection cuts off ALL thoracolumbar sympathetic neurons (T1-L2) from the medullary cardiovascular centre, causing a marked fall in MBP from ~100 to ~40 mmHg.', difficulty: 'hard' },
    { questionType: 'mcq', question: 'Babinski sign (abnormal plantar reflex) is a feature of:', options: ['A) Lower motor neuron lesion', 'B) Upper motor neuron lesion', 'C) Both UMNL and LMNL', 'D) Peripheral neuropathy'], correctAnswer: 'B) Upper motor neuron lesion', explanation: 'Babinski sign (extensor plantar response) is present in UMNL due to loss of cortical inhibition. In LMNL, the plantar reflex is absent. In normal adults, the plantar response is flexor.', difficulty: 'easy' },
    { questionType: 'mcq', question: 'Clonus is MOST LIKELY to occur in:', options: ['A) Lower motor neuron lesion', 'B) Upper motor neuron lesion', 'C) Cerebellar lesion', 'D) Peripheral neuropathy'], correctAnswer: 'B) Upper motor neuron lesion', explanation: 'Clonus (repeated involuntary jerky movements during deep reflex testing) occurs due to hypertonicity in UMNL. Examples: multiple sclerosis, stroke, cerebral palsy, meningitis.', difficulty: 'easy' },
    { questionType: 'mcq', question: 'Fasciculations on EMG are characteristic of:', options: ['A) Upper motor neuron lesion', 'B) Lower motor neuron lesion', 'C) Cerebellar lesion', 'D) Sensory neuropathy'], correctAnswer: 'B) Lower motor neuron lesion', explanation: 'Fasciculations (visible muscle twitching) are a hallmark of LMNL. They represent spontaneous firing of denervated motor units. UMNL does NOT cause fasciculations.', difficulty: 'medium' },
    { questionType: 'mcq', question: 'Quadriplegia results from spinal cord injury at which level?', options: ['A) Thoracic (T1-T12)', 'B) Cervical (C1-C8)', 'C) Lumbar (L1-L5)', 'D) Sacral (S1-S5)'], correctAnswer: 'B) Cervical (C1-C8)', explanation: 'Cervical transection (C1-8) causes quadriplegia (loss of motor function in all 4 limbs). Thoracic = paraplegia. Lumbar = lower limb weakness with possible sensory preservation.', difficulty: 'easy' },
    { questionType: 'mcq', question: 'Hemiplegia is paralysis of:', options: ['A) One limb', 'B) Both lower limbs', 'C) One side of the body', 'D) All four limbs'], correctAnswer: 'C) One side of the body', explanation: 'Hemiplegia = upper + lower limb on one side. Caused by lesion in motor cortex or corticospinal tracts in internal capsule on the OPPOSITE side (contralateral lesion).', difficulty: 'easy' },
    { questionType: 'mcq', question: 'The dorsal root of a spinal nerve carries:', options: ['A) Motor fibres', 'B) Sensory fibres', 'C) Both motor and sensory', 'D) Autonomic fibres only'], correctAnswer: 'B) Sensory fibres', explanation: 'Dorsal (posterior) root carries afferent (sensory) fibres. Ventral (anterior) root carries efferent (motor) fibres. Bell-Magendie law.', difficulty: 'easy' },

    // VISION — MCQ
    { questionType: 'mcq', question: 'Photopic vision is mediated by:', options: ['A) Rods', 'B) Cones', 'C) Both rods and cones', 'D) Bipolar cells'], correctAnswer: 'B) Cones', explanation: 'Photopic (daylight) vision is mediated by cones. There are 3 types of cones (S/blue, M/green, L/red) enabling trichromatic colour vision. Cones are concentrated in the fovea centralis.', difficulty: 'easy' },
    { questionType: 'mcq', question: 'Night blindness (nyctalopia) is MOST LIKELY caused by:', options: ['A) Cone dystrophy', 'B) Vitamin A deficiency', 'C) Macular degeneration', 'D) Glaucoma'], correctAnswer: 'B) Vitamin A deficiency', explanation: 'Vitamin A is required for rhodopsin regeneration in rods. Without it, rods cannot function in dim light → night blindness. Also seen in retinitis pigmentosa (rod degeneration).', difficulty: 'easy' },
    { questionType: 'mcq', question: 'The peak spectral sensitivity for scotopic vision is approximately:', options: ['A) 420 nm', 'B) 507 nm', 'C) 555 nm', 'D) 620 nm'], correctAnswer: 'B) 507 nm', explanation: 'Scotopic (rod) vision peaks at ~507 nm (blue-green). Photopic (cone) vision peaks at ~555 nm (green-yellow). This shift is called the Purkinje shift.', difficulty: 'medium' },
    { questionType: 'mcq', question: 'Rods are MOST concentrated in the:', options: ['A) Fovea centralis', 'B) Optic disc', 'C) Peripheral retina', 'D) Macula lutea'], correctAnswer: 'C) Peripheral retina', explanation: 'Rods are mostly in the peripheral retina and are ABSENT from the fovea. Cones are concentrated in the fovea. This is why peripheral vision is better in dim light.', difficulty: 'medium' },

    // THALAMUS — MCQ
    { questionType: 'mcq', question: 'The ONLY sensory pathway that initially bypasses the thalamus is:', options: ['A) Vision', 'B) Hearing', 'C) Olfaction', 'D) Touch'], correctAnswer: 'C) Olfaction', explanation: 'Olfaction (smell) is the only sensory pathway that bypasses the thalamus initially, projecting directly from olfactory bulb to olfactory cortex. All other sensations (vision, hearing, touch, taste) relay through the thalamus.', difficulty: 'easy' },
    { questionType: 'mcq', question: 'Visual impulses are relayed in which thalamic nucleus?', options: ['A) Medial Geniculate Body', 'B) Lateral Geniculate Body', 'C) VPL', 'D) Anterior nucleus'], correctAnswer: 'B) Lateral Geniculate Body', explanation: 'LGB relays visual impulses to visual cortex. MGB relays auditory impulses. VPL relays body somatosensory. VPM relays face somatosensory.', difficulty: 'medium' },
    { questionType: 'mcq', question: 'Auditory impulses are relayed in which thalamic nucleus?', options: ['A) VPL', 'B) Lateral Geniculate Body', 'C) Medial Geniculate Body', 'D) Pulvinar'], correctAnswer: 'C) Medial Geniculate Body', explanation: 'The Medial Geniculate Body receives ascending auditory fibres and relays them to the auditory cortex in the temporal lobe.', difficulty: 'medium' },
    { questionType: 'mcq', question: 'The thalamic nucleus involved in emotion and memory is the:', options: ['A) VPL', 'B) Mediodorsal', 'C) Anterior nucleus', 'D) Intralaminar'], correctAnswer: 'C) Anterior nucleus', explanation: 'The anterior nucleus receives input from mammillary bodies (mammillothalamic tract) and projects to the cingulate gyrus. Part of the Papez circuit for emotion and memory.', difficulty: 'hard' },
    { questionType: 'mcq', question: 'Which thalamic nuclei receive input from basal ganglia and cerebellum for motor coordination?', options: ['A) VPL and VPM', 'B) VA and VL', 'C) LGB and MGB', 'D) Anterior and Mediodorsal'], correctAnswer: 'B) VA and VL', explanation: 'Ventral Anterior (VA) and Ventral Lateral (VL) nuclei receive motor inputs from basal ganglia and cerebellum, then project to motor cortex for movement planning and execution.', difficulty: 'hard' },

    // TRUE/FALSE
    { questionType: 'true_false', question: 'Insulin is the only hormone that lowers blood glucose. True or False?', options: ['True', 'False'], correctAnswer: 'True', explanation: 'Insulin is the ONLY hypoglycaemic hormone. All other hormones (glucagon, cortisol, GH, epinephrine, thyroid hormones) raise blood glucose.', difficulty: 'easy' },
    { questionType: 'true_false', question: 'The adrenal medulla is of mesodermal origin. True or False?', options: ['True', 'False'], correctAnswer: 'False', explanation: 'The adrenal medulla is of neural crest origin (ectoderm). The adrenal cortex is of mesodermal origin. This is a commonly tested embryology point.', difficulty: 'medium' },
    { questionType: 'true_false', question: 'The foramen ovale allows blood to pass from left atrium to right atrium in the foetus. True or False?', options: ['True', 'False'], correctAnswer: 'False', explanation: 'The foramen ovale allows blood to pass from RIGHT atrium to LEFT atrium in the foetus, bypassing the non-functional lungs.', difficulty: 'easy' },
    { questionType: 'true_false', question: 'Olfaction relays through the thalamus before reaching the cortex. True or False?', options: ['True', 'False'], correctAnswer: 'False', explanation: 'Olfaction is the only sensory modality that initially bypasses the thalamus, projecting directly from the olfactory bulb to the olfactory cortex.', difficulty: 'easy' },
    { questionType: 'true_false', question: 'Babinski sign is present in lower motor neuron lesions. True or False?', options: ['True', 'False'], correctAnswer: 'False', explanation: 'Babinski sign (extensor plantar response) is present in UPPER motor neuron lesions. In LMNL, the plantar reflex is absent. Normal adults have a flexor plantar response.', difficulty: 'easy' },
    { questionType: 'true_false', question: 'DKA can occur in Type 2 DM. True or False?', options: ['True', 'False'], correctAnswer: 'False', explanation: 'DKA occurs only in absolute insulin deficiency (Type 1 DM). Type 2 DM, which has relative insulin deficiency/resistance, typically presents with HHS (Hyperosmolar Hyperglycaemic State), not DKA.', difficulty: 'medium' },
    { questionType: 'true_false', question: 'Rods can detect colour. True or False?', options: ['True', 'False'], correctAnswer: 'False', explanation: 'Rods provide achromatic (black, white, grey) vision only. Colour vision requires cones with their three photopigments (S/M/L for blue/green/red).', difficulty: 'easy' },

    // FILL IN THE BLANK
    { questionType: 'fill_blank', question: 'The three zones of the adrenal cortex from outer to inner are Zona Glomerulosa, Zona _____, and Zona Reticularis.', options: [], correctAnswer: 'Fasciculata', explanation: 'Zona Fasciculata is the middle zone of the adrenal cortex. It secretes glucocorticoids (primarily cortisol). Mnemonic: GFR = Salt, Sugar, Sex.', difficulty: 'easy' },
    { questionType: 'fill_blank', question: 'The ductus arteriosus after birth becomes the ligamentum _____.', options: [], correctAnswer: 'arteriosum', explanation: 'After birth, increased oxygen tension causes the ductus arteriosus to constrict and eventually become the ligamentum arteriosum.', difficulty: 'easy' },
    { questionType: 'fill_blank', question: 'Spastic paralysis, hyperreflexia, and positive Babinski sign indicate a(n) _____ motor neuron lesion.', options: [], correctAnswer: 'Upper', explanation: 'Upper motor neuron lesion (UMNL) features: hypertonia, spastic paralysis, exaggerated deep reflexes, positive Babinski sign, clonus. LMNL features: hypotonia, flaccid paralysis, lost reflexes.', difficulty: 'easy' },
    { questionType: 'fill_blank', question: 'The visual pigment in rods is called _____ and requires Vitamin A for regeneration.', options: [], correctAnswer: 'Rhodopsin', explanation: 'Rhodopsin is the visual pigment in rods. It is bleached by bright light and regenerates in darkness. Vitamin A deficiency → inadequate rhodopsin → night blindness.', difficulty: 'easy' },
    { questionType: 'fill_blank', question: 'Spermatogenesis takes approximately _____ days from primitive germ cell to mature spermatozoon.', options: [], correctAnswer: '74', explanation: 'The complete process of spermatogenesis takes about 74 days. It begins at puberty and continues throughout adult life in the seminiferous tubules.', difficulty: 'medium' },

    // CLINICAL SCENARIOS
    { questionType: 'mcq', question: 'A 28-year-old woman presents with weight loss, polyuria, polydipsia, and fruity-smelling breath. Blood glucose is 450 mg/dL. The MOST LIKELY diagnosis is:', options: ['A) Type 2 DM with HHS', 'B) Type 1 DM with DKA', 'C) Gestational diabetes', 'D) Insulinoma'], correctAnswer: 'B) Type 1 DM with DKA', explanation: 'Young patient + weight loss + 3 Ps + fruity breath (ketones) + very high glucose = Type 1 DM with DKA. The fruity breath indicates ketone body production from uncontrolled lipolysis in absolute insulin deficiency.', difficulty: 'medium' },
    { questionType: 'mcq', question: 'A patient has moon face, central obesity, purple striae, and hypertension. The MOST LIKELY diagnosis is:', options: ['A) Addison\'s disease', 'B) Cushing\'s syndrome', 'C) Conn\'s syndrome', 'D) Phaeochromocytoma'], correctAnswer: 'B) Cushing\'s syndrome', explanation: 'Classic Cushing\'s presentation: moon face, buffalo hump, truncal/central obesity, purple striae, HTN, DM, muscle wasting. Caused by excess cortisol from pituitary adenoma, adrenal tumour, or exogenous steroids.', difficulty: 'easy' },
    { questionType: 'mcq', question: 'A newborn has a continuous machine-like murmur. The MOST LIKELY diagnosis is:', options: ['A) VSD', 'B) ASD', 'C) Patent Ductus Arteriosus', 'D) Tetralogy of Fallot'], correctAnswer: 'C) Patent Ductus Arteriosus', explanation: 'PDA = failure of the ductus arteriosus to close after birth. Presents with a continuous "machinery" murmur. Treated with indomethacin (inhibits prostaglandins that keep DA open) or surgical ligation.', difficulty: 'medium' },
  ],

  flashcards: [
    { front: 'What are the 4 cell types of Islets of Langerhans?', back: 'Beta (60-70%): Insulin. Alpha (20-25%): Glucagon. Delta (5-10%): Somatostatin. PP/F (1-5%): Pancreatic polypeptide.', difficulty: 'easy' },
    { front: 'Insulin vs Glucagon — key differences?', back: 'Insulin: 51 aa, beta cells, TKR, ↓glucose, only hypoglycaemic hormone. Glucagon: 29 aa, alpha cells, GPCR→cAMP, ↑glucose, counter-regulatory.', difficulty: 'easy' },
    { front: 'Type 1 vs Type 2 DM?', back: 'T1: autoimmune β-cell destruction, absolute deficiency, HLA-DR3/4, DKA, young. T2: insulin resistance, relative deficiency, genetic+lifestyle, HHS, older/obese.', difficulty: 'medium' },
    { front: 'Three zones of adrenal cortex + hormones?', back: 'GFR = Salt, Sugar, Sex. Glomerulosa→Aldosterone. Fasciculata→Cortisol. Reticularis→Androgens (DHEA).', difficulty: 'easy' },
    { front: 'Cushing\'s vs Addison\'s?', back: 'Cushing\'s = cortisol EXCESS: moon face, obesity, HTN, DM. Addison\'s = cortisol DEFICIENCY: hyperpigmentation, hypotension, weight loss, hyperkalaemia.', difficulty: 'medium' },
    { front: 'Three foetal shunts and what they become?', back: 'Ductus Venosus → ligamentum venosum (bypassed liver). Foramen Ovale → fossa ovalis (bypassed lungs). Ductus Arteriosus → ligamentum arteriosum (bypassed lungs).', difficulty: 'medium' },
    { front: 'UMNL vs LMNL — key features?', back: 'UMNL: spastic paralysis, hypertonia, hyperreflexia, Babinski+, clonus, groups of muscles. LMNL: flaccid paralysis, hypotonia, areflexia, fasciculations, individual muscles.', difficulty: 'medium' },
    { front: 'Types of paralysis?', back: 'Monoplegia=1 limb. Diplegia=both UL or LL. Hemiplegia=one side. Paraplegia=lower body. Quadriplegia=all 4 limbs.', difficulty: 'easy' },
    { front: 'Photopic vs Scotopic vision?', back: 'Photopic: cones, daylight, high acuity, colour, fovea, 555nm. Scotopic: rods, night, low acuity, no colour, peripheral retina, 507nm.', difficulty: 'easy' },
    { front: 'What does the thalamus relay?', back: 'ALL sensory pathways EXCEPT olfaction. VPL/VPM=somatosensory, LGB=vision, MGB=hearing, VA/VL=motor, Anterior=emotion/memory.', difficulty: 'medium' },
    { front: 'OGTT interpretation values?', back: 'Normal: fasting <6.1 mmol/L. Impaired: 6.1-7.0 mmol/L. Diabetic: ≥7.0 mmol/L fasting, repeatedly.', difficulty: 'medium' },
    { front: 'Catecholamine synthesis pathway?', back: 'Tyrosine → DOPA (rate-limiting: tyrosine hydroxylase) → Dopamine → Norepinephrine → Epinephrine (PNMT, needs cortisol).', difficulty: 'hard' },
  ],
};
