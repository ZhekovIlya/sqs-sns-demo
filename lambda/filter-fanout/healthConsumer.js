exports.handler = async (event) => {
	console.log('Health Insurance Event');
	try {
        console.log(JSON.stringify(event));
		event.Records.forEach(it => console.log(JSON.parse(it.body).Message));
    } catch (e) {
		console.log('error');
    }
};