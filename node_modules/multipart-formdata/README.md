# multipart-formdata

A zero-dependency multipart/form-data parser.

### Background

Sometimes you only have access to the raw multipart payload and need it to be
parsed in order to extract files or data.

Example: Using a serverless api such as `claudia-api-builder` with AWS Api-Gateway/Lambda.

The raw payload formatted as multipart/form-data will looks like this one:

```
// req.body

------WebKitFormBoundaryDtbT5UpPj83kllfw
Content-Disposition: form-data; name="uploads"; filename="somebinary.dat"
Content-Type: application/octet-stream

some binary data...maybe the bits of a image..
------WebKitFormBoundaryDtbT5UpPj83kllfw
Content-Disposition: form-data; name="uploads"; filename="sometext.txt"
Content-Type: text/plain

hello world
------WebKitFormBoundaryDtbT5UpPj83kllfw--
```

The lines above represent a raw multipart/form-data payload sent by an HTTP client via form submission containing two files. The multipart parser allows us to separate the files and extract header information.

### Usage

* `req.body`

```
------WebKitFormBoundaryDtbT5UpPj83kllfw
Content-Disposition: form-data; name="uploads[]"; filename="sometext.txt"
Content-Type: application/octet-stream

hello how are you
------WebKitFormBoundaryDtbT5UpPj83kllfw--
```

* boundary, the unique string which serve as a 'separator' between parts, normally parsed from headers. In this case, the boundary is:

```
	----WebKitFormBoundaryDtbT5UpPj83kllfw
```


* Example implementation

```javascript
	var multipart = require('parse-multipart');
	var body = "..the multipart raw body..";
	var boundary = "----WebKitFormBoundaryDtbT5UpPj83kllfw";
	var parts = multipart.parse(body, boundary);

  /*
  console.log(parts);

	[{
		data:     <Buffer 41 41 41 41 42 42 42 42>,
		field:    '',
		filename: 'A.txt',
		name:     'file',
		type:     'text/plain',
	}, ...];
	*/
```

The returned data is an array of objects, each with a filename, any data fields, field name, content-type and data properties. The data prop is a Buffer (see also Node Buffer).
