import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:flutter/foundation.dart';

class ApiClient {
  static final SupabaseClient _client = Supabase.instance.client;

  /// Invokes a Supabase Edge Function with standard error handling.
  /// 
  /// [functionName] The name of the Edge Function to invoke.
  /// [body] Optional JSON body to send.
  static Future<FunctionResponse> invokeFunction(
    String functionName, {
    Map<String, dynamic>? body,
  }) async {
    try {
      final response = await _client.functions.invoke(
        functionName,
        body: body,
      );

      if (response.status != 200) {
        debugPrint('API Error [$functionName]: ${response.status} - ${response.data}');
        throw Exception('API returned status ${response.status}: ${response.data}');
      }

      return response;
    } on FunctionException catch (e) {
      debugPrint('FunctionException [$functionName]: ${e.details}');
      throw Exception('Function Error: ${e.details}');
    } catch (e) {
      debugPrint('Unknown Error [$functionName]: $e');
      throw Exception('Network Error: $e');
    }
  }
}
