export interface User {
    uuid: string;
    username: string;
    email: string;
    password?: string;
    created_at: string;
}

export interface Question {
    uuid: string;
    text: string;
    choices: string[];
    correct_answer: number;
    type: string;
    created_at: string;
}