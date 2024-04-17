exports.handler = async (event) => {
	console.log('Volvo Exclusive Event');
	try {
        console.log(JSON.stringify(event));
		event.Records.forEach(it => console.log(JSON.parse(it.body).Message));
    } catch (e) {
		console.log('error');
    }
};