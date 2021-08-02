let team_skill_types = [
	TEAM_RELOAD_UP_NULL, TEAM_RELOAD_UP_MEDIUM, TEAM_RELOAD_UP_LARGE,
	TEAM_RELOAD_UP_SUPER_1, TEAM_RELOAD_UP_SUPER_2
];

let team_skill_texts = [
	"装填UPなし", "装填UP中", "装填UP大", "装填UP超一", "装填UP超二"
];

let team_skill_colors = [
	"#000000", "#800000", "#0000FF", "#FF00FF", "#FF00FF"
];

let leader_skill_types = [
	LEADER_RELOAD_UP_NULL, LEADER_RELOAD_UP_LARGE_2, LEADER_RELOAD_UP_LARGE_3, LEADER_RELOAD_UP_LARGE_ALL
];

let leader_skill_texts = [
	"装填UPに繋がりなし", "装填を含む二種類UP大", "装填を含む三種類UP大", "装填を含む全種類UP大"
];
	
let leader_skill_colors = [
	"#000000", "#800000", "#0000FF", "#FF00FF"
];

for (button of document.querySelectorAll("button.team-skill")) {
	button.addEventListener("click", function() {
		let index = team_skill_types.findIndex(type => type === this.dataset.skillType);
		index = (index + 1) % team_skill_types.length;
		this.dataset.skillType = team_skill_types[index];
		this.innerHTML = team_skill_texts[index];
		this.style.color = team_skill_colors[index];
	});
}

for (button of document.querySelectorAll("button.leader-skill-status")) {
	button.addEventListener("click", function() {
		if (this.dataset.activated === "true") {
			this.innerHTML = "発動なし";
			this.style.color = "#000000";
			this.dataset.activated = "false";
		} else {
			this.innerHTML = "発動有り";
			this.style.color = "#0000FF";
			this.dataset.activated = "true";
		}
	});
}

document.querySelector("button#leader-skill-selector").addEventListener("click", function() {
	let index = leader_skill_types.findIndex(type => type === this.dataset.skillType);
	index = (index + 1) % leader_skill_types.length;
	this.dataset.skillType = leader_skill_types[index];
	this.innerHTML = leader_skill_texts[index];
	this.style.color = leader_skill_colors[index];
});


document.querySelector("button#start-calculation").addEventListener("click", function() {
	
	if (this.dataset.activated === "false") {
		
		this.dataset.activated = "true";
		this.innerHTML = "編成編集へ";
		
		// Retrieves information from relevant nodes.
		let leader_skill = document.querySelector("button#leader-skill-selector").dataset.skillType;
		let leader_skill_statuses = Array.from(document.querySelectorAll("button.leader-skill-status")).map(button => button.dataset.activated === "true");
		
		let trs = Array.from(document.querySelector("table#team-status").querySelectorAll("tr"));
		// Note that index 0 is occupied by the table's default header.
		let team_trs = trs.slice(1);
		let firepowers = [];
		let reloads = [];
		let team_skill_sets = [];
		for (tr of team_trs) {
			firepowers.push(parseInt(tr.querySelector("input#firepower").value));
			reloads.push(parseInt(tr.querySelector("input#reload").value));
			let team_skill_buttons = Array.from(tr.querySelectorAll("button.team-skill"));
			team_skill_sets.push(team_skill_buttons.map(button => button.dataset.skillType));
		}
		console.log(firepowers);
		console.log(reloads);
		console.log(team_skill_sets);
		
		let play_number = parseInt(document.querySelector("input#play-number").value);
		
		// Calculates statistics.
		let result_matrix = [];
		let brigade_damage_mean_without_leader_skill = 0;
		let brigade_damage_variance_without_leader_skill = 0;
		let brigade_damage_mean_with_leader_skill = 0;
		let brigade_damage_variance_with_leader_skill = 0;
		for (let i = 0; i < firepowers.length; i++) {
			let tank_rate_distribution_without_leader_skill = getTankRateDistribution(reloads[i], team_skill_sets[i], LEADER_RELOAD_UP_NULL);
			let tank_rate_distribution_with_leader_skill = getTankRateDistribution(reloads[i], team_skill_sets[i], leader_skill);
			brigade_damage_mean_without_leader_skill += tank_rate_distribution_without_leader_skill.mean * firepowers[i] * 5;
			brigade_damage_variance_without_leader_skill += tank_rate_distribution_without_leader_skill.variance * (firepowers[i] ** 2) * 25;
			brigade_damage_mean_with_leader_skill += tank_rate_distribution_with_leader_skill.mean * firepowers[i] * 5;
			brigade_damage_variance_with_leader_skill += tank_rate_distribution_with_leader_skill.variance * (firepowers[i] ** 2) * 25;
			let results = [];
			let result_without_leader_skill = "";
			for (let i = 0; i < tank_rate_distribution_without_leader_skill.values.length; i++) {
				let rate = tank_rate_distribution_without_leader_skill.values[i];
				let percent = tank_rate_distribution_without_leader_skill.probabilities[i] * 100;
				if (rate < 3.7) {
					result_without_leader_skill += "" + Number(rate).toPrecision(3) + "[発/秒]の確率：" + Number(percent).toPrecision(3) + "％<br />"
				} else {
					result_without_leader_skill += "<span class='max-rate-highlight'>" + Number(rate).toPrecision(3) +
					"[発/秒]を達し若しくは</br >マシンガン化の確率：" + Number(percent).toPrecision(3) + "％</span><br />"
				}
			}
			let result_with_leader_skill = "";
			for (let i = 0; i < tank_rate_distribution_with_leader_skill.values.length; i++) {
				let rate = tank_rate_distribution_with_leader_skill.values[i];
				let percent = tank_rate_distribution_with_leader_skill.probabilities[i] * 100;
				if (rate < 3.7) {
					result_with_leader_skill += "" + Number(rate).toPrecision(3) + "[発/秒]の確率：" + Number(percent).toPrecision(3) + "％<br />"
				} else {
					result_with_leader_skill += "<span class='max-rate-highlight'>" + Number(rate).toPrecision(3) +
					"[発/秒]を達し若しくは</br >マシンガン化の確率：" + Number(percent).toPrecision(3) + "％</span><br />"
				}
			}
			result_matrix.push([result_without_leader_skill, result_with_leader_skill]);
		}
		console.log(result_matrix);
		
		// Stores results as mean and sd.
		let brigade_statistics = [];
		let brigade_battle_damage_mean = 0;
		let brigade_battle_damage_variance = 0;
		for (let i = 0; i < 5; i++) {
			if (leader_skill_statuses[i]) {
				brigade_statistics.push(brigade_damage_mean_with_leader_skill, brigade_damage_variance_with_leader_skill ** 0.5);
				brigade_battle_damage_mean += brigade_damage_mean_with_leader_skill;
				brigade_battle_damage_variance += brigade_damage_variance_with_leader_skill;
			} else {
				brigade_statistics.push(brigade_damage_mean_without_leader_skill, brigade_damage_variance_without_leader_skill ** 0.5);
				brigade_battle_damage_mean += brigade_damage_mean_without_leader_skill;
				brigade_battle_damage_variance += brigade_damage_variance_without_leader_skill;
			}
		}
		brigade_statistics.push(brigade_battle_damage_mean, brigade_battle_damage_variance ** 0.5);
		
		let brigade_play_damage_mean = brigade_battle_damage_mean * play_number;
		let brigade_play_damage_sd = (brigade_battle_damage_variance * play_number) ** 0.5;
		let brigade_play_damage_CI = [brigade_play_damage_mean - 1.96 * brigade_play_damage_sd, brigade_play_damage_mean + 1.96 * brigade_play_damage_sd];
		
		// Displays results.
		for (let i = 0; i < result_matrix.length; i++) {
			let result_ths = Array.from(team_trs[i].querySelectorAll("th.result"));
			for (let j = 0; j < result_ths.length; j++) {
				result_ths[j].innerHTML = result_matrix[i][j];
			}
		}
		
		let brigade_statistic_ths = Array.from(document.querySelectorAll("th.brigade-statistics"));
		for (let i = 0; i < brigade_statistics.length; i++) {
			brigade_statistic_ths[i].innerHTML = parseInt(brigade_statistics[i]);
		}
		
		let total_rhs = Array.from(document.querySelectorAll("th.total"));
		total_rhs[0].innerHTML = parseInt(brigade_play_damage_mean);
		total_rhs[1].innerHTML = parseInt(brigade_play_damage_sd);
		total_rhs[2].innerHTML = parseInt(brigade_play_damage_CI[0]) + "から";
		total_rhs[3].innerHTML = parseInt(brigade_play_damage_CI[1]) + "まで";
				
	} else {
		this.dataset.activated = "false";
		this.innerHTML = "統計始め";
	}
	
	
	
});
	
















