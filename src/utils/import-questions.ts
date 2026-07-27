import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

// Initialisation du client Supabase
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const DATA_DIR = path.join(__dirname, '../../questions');

async function importAllQuestions() {
    console.log("🚀 Début de l'importation...");

    // 1. Lire tous les fichiers du dossier
    const files = fs.readdirSync(DATA_DIR).filter(file => file.endsWith('.json'));

    if (files.length === 0) {
        console.error("❌ Aucun fichier JSON trouvé dans le dossier.");
        return;
    }

    for (const file of files) {
        const filePath = path.join(DATA_DIR, file);
        console.log(`📖 Lecture du fichier : ${file}...`);

        try {
            const rawData = fs.readFileSync(filePath, 'utf-8');
            const questions = JSON.parse(rawData);

            // 2. Adapter le format (correctAnswer -> correct_answer)
            const formattedQuestions = (Array.isArray(questions) ? questions : [questions]).map(q => ({
                text: q.text,
                choices: q.choices,
                correct_answer: q.correctAnswer, // Mapping crucial
                type: q.type
            }));

            // 3. Envoyer par paquets (Batch insert)
            const { data, error } = await supabase
                .from('questions')
                .insert(formattedQuestions);

            if (error) {
                console.error(`❌ Erreur lors de l'import de ${file}:`, error.message);
            } else {
                console.log(`✅ ${formattedQuestions.length} questions importées depuis ${file}.`);
            }
        } catch (err) {
            console.error(`❌ Erreur de lecture sur le fichier ${file}:`, err);
        }
    }

    console.log("🏁 Importation terminée !");
}

importAllQuestions();