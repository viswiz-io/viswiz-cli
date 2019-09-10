import { error } from './utils';

export const apiKey = program => {
	if (!program.apiKey) {
		return error('Error: Missing API key!', program);
	}
};

export const projectID = program => {
	if (!program.project) {
		return error('Error: Missing project ID!', program);
	}
};
