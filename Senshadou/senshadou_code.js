// Calculates base attack rate from reload.
let TEAM_RELOAD_UP_NULL = "tn";
let TEAM_RELOAD_UP_MEDIUM = "tm";
let TEAM_RELOAD_UP_LARGE = "tl";
let TEAM_RELOAD_UP_SUPER_1 = "ts1";
let TEAM_RELOAD_UP_SUPER_2 = "ts2";
let LEADER_RELOAD_UP_NULL = "ln";
let LEADER_RELOAD_UP_LARGE_2 = "ll2";
let LEADER_RELOAD_UP_LARGE_3 = "ll3";
let LEADER_RELOAD_UP_LARGE_ALL = "ll6";

let probability_query = {
	[TEAM_RELOAD_UP_NULL]: 0.500,
	[TEAM_RELOAD_UP_MEDIUM]: 0.115,
	[TEAM_RELOAD_UP_LARGE]: 0.165,
	[TEAM_RELOAD_UP_SUPER_1]: 0.200,
	[TEAM_RELOAD_UP_SUPER_2]: 0.200
};

let bonus_query = {
	[TEAM_RELOAD_UP_NULL]: 0.00,
	[TEAM_RELOAD_UP_MEDIUM]: 0.65,
	[TEAM_RELOAD_UP_LARGE]: 1.00,
	[TEAM_RELOAD_UP_SUPER_1]: 1.20,
	[TEAM_RELOAD_UP_SUPER_2]: 0.90,
	[LEADER_RELOAD_UP_NULL]: 0.00,
	[LEADER_RELOAD_UP_LARGE_2]: 0.75,
	[LEADER_RELOAD_UP_LARGE_3]: 0.60,
	[LEADER_RELOAD_UP_LARGE_ALL]: 0.50
};



function arrayComp(v1, v2) {
	if (v1.length !== v2.length) {
		return false;
	} else {
		for (let i = 0; i < v1.length; i++) {
			if (v1[i] !== v2[i]) return false;
		}
		return true;
	}
}




function arrayAccumulator(op) {
	return function(v) {
		if (v.length === 0) {
			throw "ERROR: Cannot accumulate over an empty array.";
		} else if (v.length === 1) {
			return v[0];
		} else {
			let result = v[0];
			for (let i = 1; i < v.length; i++) {
				result = op(result, v[i]);
			}
			return result;
		}
	};
};

let arraySum = arrayAccumulator((a, b) => a + b);
let arrayProduct = arrayAccumulator((a, b) => a * b);

function arrayPairwiseOperator(op) {
	return function(v1, v2) {
		if (v1.length !== v2.length) {
			throw "ERROR: Cannot operate over two arrays of different lengths.";
		} else {
			let results = [];
			for (let i = 0; i < v1.length; i++) {
				results[i] = op(v1[i], v2[i]);
			}
			return results;
		}
	};
}

let arrayElemAdd = arrayPairwiseOperator((a, b) => a + b);
let arrayElemMul = arrayPairwiseOperator((a, b) => a * b);

function dotProduct(v1, v2) {
	return arraySum(arrayElemMul(v1, v2));
}
	


class Distribution {
	
	constructor(values, probabilities) {
		
		this.values = values;
		this.probabilities = probabilities;
		this.mean = dotProduct(this.values, this.probabilities);
		this.variance = dotProduct(this.values.map(value => (value - this.mean) ** 2), this.probabilities);
		this.sd = this.variance ** 0.5;
		
		for (let i = 0; i < this.values.length - 1; i++) {
			for (let j = i + 1; j < this.values.length; j++) {
				if (this.values[i] > this.values[j]) {
					let temp_value = this.values[i];
					this.values[i] = this.values[j];
					this.values[j] = temp_value;
					let temp_probability = this.probabilities[i];
					this.probabilities[i] = this.probabilities[j];
					this.probabilities[j] = temp_probability;
				}
			}
		}
		
	}
	
	// Adds two independent random variables. 
	add(dist2) {
		let values = [];
		let probabilities = [];
		for (let i = 0; i < this.values.length; i++) {
			for (let j = 0; j < dist2.values.length; j++) {
				let new_value = this.values[i] + dist2.values[j];
				let new_probability = this.probabilities[i] * dist2.probabilities[j];
				let index = values.findIndex(elem => elem === new_value);
				if (index !== -1) {
					probabilities[index] += new_probability;
				} else {
					values.push(new_value);
					probabilities.push(new_probability);
				}
			}
		}
		return new Distribution(values, probabilities);
	}
	
	// Multiplies the random variable by a scalar constant.
	map(op, bijective) {
		if (bijective) {
			return new Distribution(this.values.map(op), this.probabilities);
		} else {
			let values = [];
			let probabilities = [];
			for (let i = 0; i < this.values.length; i++) {
				let new_value = op(this.values[i]);
				let index = values.findIndex(value => value === new_value);
				if (index !== -1) {
					probabilities[index] += this.probabilities[i];
				} else {
					values.push(new_value);
					probabilities.push(this.probabilities[i]);
				}
			}
			return new Distribution(values, probabilities);
		}
	}

}
		





function getBaseRate(reload) {
	return reload / 9000;
}

// Calculates augmented attack rate from reload and reload bonuses.
function getAugmentedRate(reload, bonuses) {
	let base_rate = getBaseRate(reload);
	let augmented_rate = base_rate / (1 - 0.37 * bonuses);
	return (augmented_rate > 3.7) ? 3.7 : augmented_rate;
}

// Computes the probability distribution based on the team bonus types and leader bonus types.
// Team bonus type must be an array of strings of 6 elements. In case that personnel count is less than 6, or the member does not possess team bonus skill,
// a null must be included to fill the space.
function getTankBonusDistribution(team_skills, leader_skill) {
	
	// Extracts bonus attributes.
	let leader_bonus = bonus_query[leader_skill];
	let team_bonus_probabilities = team_skills.map(team_skill => probability_query[team_skill]);
	// The last member of the team has only 90% of the usual probability to activate her skill.
	team_bonus_probabilities[5] *= 0.9;
	let team_bonuses = team_skills.map(team_skill => bonus_query[team_skill]);
	
	console.log(team_bonuses);
	console.log(team_bonus_probabilities);
	
	// Generates all possible permutations.
	let activation_permutations = [];
	let permutation_generator = [0, 0, 0, 0, 0, 0];
	while (true) {
		activation_permutations.push([...permutation_generator]);
		if (arrayComp(permutation_generator, [1, 1, 1, 1, 1, 1])) {
			break;
		}
		for (let i = 5; i >= 0; i--) {
			if (permutation_generator[i] === 0) {
				permutation_generator[i] = 1;
				break;
			} else {
				permutation_generator[i] = 0;
			}
		}
	}
	console.log(activation_permutations);
	
	let permutation_bonuses = [];
	let permutation_probabilities = [];
	for (permutation of activation_permutations) {
		let bonus = 0;
		let probability = 1;
		for (let i = 0; i < 6; i++) {
			bonus += ((permutation[i] === 1)? team_bonuses[i] : 0);
			probability *= ((permutation[i] === 1)? team_bonus_probabilities[i] : (1 - team_bonus_probabilities[i]));
		}
		let index = permutation_bonuses.findIndex(elem => elem === bonus);
		if (index !== -1) {
			permutation_probabilities[index] += probability;
		} else {
			permutation_bonuses.push(bonus + leader_bonus);
			permutation_probabilities.push(probability);
		}
	}
	
	console.log(permutation_bonuses);
	console.log(permutation_probabilities);
	
	return new Distribution(permutation_bonuses, permutation_probabilities);

}



function getTankRateDistribution(reload, team_skills, leader_skill) {
	let tank_bonus_distribution = getTankBonusDistribution(team_skills, leader_skill);
	let base_rate = getBaseRate(reload);
	let tank_rate_distribution = tank_bonus_distribution.map((bonus) => {
		return (
			(bonus >= (1 - base_rate / 3.7) / 0.37) ?
			3.7 : base_rate / (1 - 0.37 * bonus)
		);
	}, bijective = false);
	return tank_rate_distribution;
}



function getBrigadeDamageDistribution(damages, tank_rate_distributions) {
	let brigade_damage_distribution = Distribution([0], [1]);
	for (let distribution of tank_rate_distribution) {
		brigade_damage_distribution = brigade_damage_distribution.add(distribution.map(rate => rate * damage * 5, bijective = true));
	}
	return brigade_damage_distribution;
}


			
	
	
	
	
	
		
	
	
	
	
	
	
	
	
	
	
	

	