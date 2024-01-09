let STORAGE_KEY = 'weather_bet'
let user_datas=load_user_datas();

$(document).ready(function(){
	check_bet(user_datas);
	init();

	$("#bet_form").submit(function(e){
		e.preventDefault();

		if($("#bet_amount").val()!="" && $("#weather_option").val()!="" && $("#bet_date").val()!="" && $("#bet_location").val()!="")
		{
			$.ajax({
				'url': 'https://geocoding-api.open-meteo.com/v1/search',
				'data': {
					'name': $("#bet_location").val().replace(" ", "")
				},
				'type': 'get',
				'dataType': 'json'
			})
			.done(function(result){
				user_datas.bet_list.push({
					bet_amount: parseInt($("#bet_amount").val()),
					weather_option: parseInt($("#weather_option").val()),
					bet_date: $("#bet_date").val(),
					location: {
						name: result.results[0].name,
						latitude: result.results[0].latitude,
						longitude: result.results[0].longitude
					},
					timezone: result.results[0].timezone,
					win: false,
					validated: false
				});
				user_datas.coins -= parseInt($("#bet_amount").val());
				user_datas.bet_list.sort(compare_bet);
				$("#bet_amount").val('');
				save_user_datas();
				init();
			})
		}

	});
})

function init()
{
	var today = new Date();
	var tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
	$('#bet_date').attr("min", tomorrow.toISOString().slice(0, 10));
	$('#bet_date').val(tomorrow.toISOString().slice(0, 10));

	$('#coins').text(user_datas.coins);
	$('#bet_history > table > tbody').html("");

	user_datas.bet_list.sort(compare_bet);
	for (var i = user_datas.bet_list.length - 1; i >= 0; i--) {
		$('#bet_history > table > tbody').append("<tr><td>"+user_datas.bet_list[i].bet_date+"</td><td>"+user_datas.bet_list[i].location.name+"</td><td>"+weather_code_to_string(user_datas.bet_list[i].weather_option)+"</td><td>"+user_datas.bet_list[i].bet_amount+"</td><td>"+(user_datas.bet_list[i].validated?(user_datas.bet_list[i].win?"Win":"Loose"):"Incoming")+"</td></tr>")
		user_datas.bet_list[i]
	}
}

function check_bet()
{
	var yesterday = new Date();
	yesterday.setDate((new Date()).getDate() - 1)
	var min_date = yesterday;

	for (var i = user_datas.bet_list.length - 1; i >= 0; i--){
		var bet_date = new Date(user_datas.bet_list[i].bet_date);
		if(!user_datas.bet_list[i].validated && bet_date < min_date)
		{
			min_date = bet_date;
		}
	}

	for (var i = user_datas.bet_list.length - 1; i >= 0; i--) {
		var current_bet = user_datas.bet_list[i];
		var bet_date = new Date(current_bet.bet_date);

		if(!current_bet.validated && bet_date <= yesterday)
		{
			let weathercode;

			$.ajax({
				'url': 'https://api.open-meteo.com/v1/forecast',
				'data': {
					'latitude': current_bet.location.latitude,
					'longitude': current_bet.location.longitude,
					'daily': 'weather_code',
					'timezone': current_bet.timezone,
					'past_days': Math.ceil((Date.now()-Date.parse(current_bet.bet_date))/ (1000 * 60 * 60 * 24)),
					'forecast_days': 1
				},
				'type': 'get',
				'dataType': 'json',
				'async': false
			})
			.done(function (response) {
				weathercode=parseInt(response.daily.weather_code[0]);
			})
			.fail(function(error){
				console.log(error);
			});

			switch(parseInt(current_bet.weather_option)){
			case 0: //sunny
				if([0, 1].includes(weathercode))
				{
					current_bet.win = true;
				}
				break;
			case 1: //cloudy
				if([2,3].includes(weathercode))
				{
					current_bet.win = true;
				}
				break;
			case 2: //foggy
				if([45,48,51].includes(weathercode))
				{
					current_bet.win = true;
				}
				break;
			case 3: //rainy
				if([53,55,56,57,61,63,65,66,67,80,81,82].includes(weathercode))
				{
					current_bet.win = true;
				}
				break;
			case 4: //snowy
				if([71,73,75,77,85,86].includes(weathercode))
				{
					current_bet.win = true;
				}
				break;
			case 5: //stormy
				if([95,96,99].includes(weathercode))
				{
					current_bet.win = true;
				}
				break;
			default:
				current_bet.win = false;
			}
			current_bet.validated = true;

			if(current_bet.win)
			{
				user_datas.coins += parseInt(current_bet.bet_amount)*2;
			}
		}
	}
	save_user_datas();
	init();
}

function save_user_datas()
{
	localStorage.setItem(STORAGE_KEY, JSON.stringify(user_datas));
}

function load_user_datas()
{
	return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{"coins": 100,"bet_list": []}');
}

function remove_user_datas()
{
	localStorage.removeItem(STORAGE_KEY);
}

function compare_bet(a, b)
{
	let dateA = new Date(a.bet_date);
	let dateB = new Date(b.bet_date);
	if(dateA < dateB)
	{
		return -1;
	}
	if(dateA > dateB)
	{
		return 1;
	}
	return 0;
}

function weather_code_to_string(weather_code)
{
	switch(parseInt(weather_code)){
	case 0: //sunny
		return "sunny";
		break;
	case 1: //cloudy
		return "cloudy";
		break;
	case 2: //foggy
		return "foggy";
		break;
	case 3: //rainy
		return "rainy";
		break;
	case 4: //snowy
		return "snowy";
		break;
	case 5: //stormy
		return "stormy";
		break;
	default:
		return "error";
	}
}

function needAnotherChance()
{
	remove_user_datas();
	location.reload();
}